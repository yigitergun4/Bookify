import React, { createContext, useContext, useState, useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
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
    if (!user) return;

    try {
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      await setDoc(
        userRef,
        {
          libraryBooks: arrayUnion(book),
        },
        { merge: true }
      );

      setLibraryBooks((prev) => [book, ...prev]);
    } catch (error) {
      console.error("Error adding book to library:", error);
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
