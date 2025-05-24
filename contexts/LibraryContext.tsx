import React, { createContext, useContext, useState, useEffect } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
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

  // Real-time sync with Firestore
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(FIREBASE_DB, "Users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLibraryBooks(
          data.libraryBooks ? [...data.libraryBooks].reverse() : []
        );
      } else {
        setLibraryBooks([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const addBook = async (book: any) => {
    if (!currentUser) return;

    try {
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
    } catch (error) {
      // Revert local state if Firebase update fails
      setLibraryBooks((prev) => prev.filter((b) => b.id !== book.id));
      throw error;
    }
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

  const refreshBooks = async () => {
    if (!currentUser) return;

    try {
      const userRef = doc(FIREBASE_DB, "Users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setLibraryBooks(data.libraryBooks || []);
      }
    } catch (error) {
      console.error("Error refreshing books:", error);
    }
  };

  return (
    <LibraryContext.Provider
      value={{
        books: libraryBooks,
        libraryBooks,
        addBook,
        removeBook,
        refreshBooks,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibrary = () => useContext(LibraryContext);