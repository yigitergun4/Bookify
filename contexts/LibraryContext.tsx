import React, { createContext, useContext, useState, useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const LibraryContext = createContext<any>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      setCurrentUser(user);
      // Clear books when user changes
      setLibraryBooks([]);
    });

    return () => unsubscribe();
  }, []);

  // Load books when currentUser changes
  useEffect(() => {
    const loadBooks = async () => {
      if (currentUser) {
        const userRef = doc(FIREBASE_DB, "Users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setLibraryBooks(data.libraryBooks || []);
        }
      }
    };
    loadBooks();
  }, [currentUser]);

  const addBook = async (book: any) => {
    if (!currentUser) return;

    setLibraryBooks((prev) => [book, ...prev]);

    // Save to Firebase
    const userRef = doc(FIREBASE_DB, "Users", currentUser.uid);
    await setDoc(
      userRef,
      {
        libraryBooks: arrayUnion(book),
      },
      { merge: true }
    );
  };

  const removeBook = async (bookId: string) => {
    if (!currentUser) return;

    const bookToRemove = libraryBooks.find((book) => book.id === bookId);
    if (!bookToRemove) return;

    setLibraryBooks((prev) => prev.filter((b) => b.id !== bookId));

    // Remove from Firebase
    const userRef = doc(FIREBASE_DB, "Users", currentUser.uid);
    await setDoc(
      userRef,
      {
        libraryBooks: arrayRemove(bookToRemove),
      },
      { merge: true }
    );
  };

  return (
    <LibraryContext.Provider value={{ libraryBooks, addBook, removeBook }}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);