import React, { createContext, useContext, useState, useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  updateDoc,
} from "firebase/firestore";

const LibraryContext = createContext<any>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const user = FIREBASE_AUTH.currentUser;

  useEffect(() => {
    const loadLibraryBooks = async () => {
      if (user) {
        try {
          const userRef = doc(FIREBASE_DB, "Users", user.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setLibraryBooks(data.libraryBooks || []);
          }
        } catch (error) {
          console.error("Error loading library books:", error);
        }
      }
    };

    loadLibraryBooks();
  }, [user]);

  const addBook = async (book: any) => {
    if (!user) {
      console.log("No user logged in");
      return;
    }

    try {
      const userRef = doc(FIREBASE_DB, "Users", user.uid);

      // Önce mevcut kitapları al
      const userDoc = await getDoc(userRef);
      const currentBooks = userDoc.exists()
        ? userDoc.data().libraryBooks || []
        : [];

      // Kitap zaten var mı kontrol et
      const bookExists = currentBooks.some((b: any) => b.id === book.id);
      if (bookExists) {
        console.log("Book already exists in library");
        return;
      }

      // Yeni kitabı ekle
      const updatedBooks = [...currentBooks, book];

      // Firebase'i güncelle
      await updateDoc(userRef, {
        libraryBooks: updatedBooks,
      });

      // Local state'i güncelle
      setLibraryBooks(updatedBooks);
    } catch (error) {
      throw error; // Hata durumunu üst katmana ilet
    }
  };

  const removeBook = async (bookId: string) => {
    if (!user) return;

    try {
      const bookToRemove = libraryBooks.find((book) => book.id === bookId);
      if (!bookToRemove) return;

      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      await setDoc(
        userRef,
        {
          libraryBooks: arrayRemove(bookToRemove),
        },
        { merge: true }
      );

      setLibraryBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (error) {
      console.error("Error removing book from library:", error);
    }
  };

  return (
    <LibraryContext.Provider value={{ libraryBooks, addBook, removeBook }}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);
