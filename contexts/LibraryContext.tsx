import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { RecommendationService } from "@/services/recommendationService";
import { CacheService } from "@/services/cacheService";
import { GoogleBooksItem } from "@/types/booksapitypes";

const cacheService = CacheService.getInstance();
const recommendationService = RecommendationService.getInstance();

interface LibraryContextType {
  libraryBooks: any[];
  recommendedBooks: any[];
  addBook: (book: any) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  isBookInLibrary: (bookId: string) => boolean;
  loadRecommendedBooks: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  setRecommendedBooks: React.Dispatch<React.SetStateAction<any[]>>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();

  const loadRecommendedBooks = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setError(null);
      setIsLoading(true);
      // First check Firebase for existing recommendations
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        user.uid,
        "Recommendations"
      );
      const recommendationsSnap = await getDocs(recommendationsRef);

      if (!recommendationsSnap.empty) {
        const firebaseBooks = recommendationsSnap.docs
          .map((doc) => {
            const data = doc.data();
            return data.books;
          })
          .flat();
        if (firebaseBooks.length > 0) {
          // Shuffle the books
          const shuffledBooks = [...firebaseBooks].sort(
            () => Math.random() - 0.5
          );
          setRecommendedBooks(shuffledBooks);

          // Also update cache with shuffled books
          await cacheService.saveRecommendedBooks(user.uid, shuffledBooks);
          return;
        }
      }

      // If no Firebase recommendations, check cache
      const cachedBooks: GoogleBooksItem[] =
        await cacheService.getRecommendedBooks(user.uid);

      if (cachedBooks && cachedBooks.length > 0) {
        setRecommendedBooks(cachedBooks);
      } else {
        // if cache is empty, fetch new recommendations
        const userRef = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        const queries = await recommendationService.getChatGPTRecommendations(
          userData?.favoriteGenres || [],
          [],
          userData?.library || [],
          userData?.goal || undefined
        );

        const newBooks: GoogleBooksItem[] = await Promise.all(
          queries.map((query) =>
            recommendationService.searchBooksWithQuery(query)
          )
        ).then((results) => results.flat());

        setRecommendedBooks(newBooks);

        // save to both cache and firebase
        await cacheService.saveRecommendedBooks(user.uid, newBooks);
        await recommendationService.saveRecommendations(user.uid, newBooks);
      }
    } catch (error) {
      console.error("[LibraryContext] Error loading recommended books:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addBook = async (book: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      // Check if book is already in library
      if (isBookInLibrary(book.id)) {
        throw new Error("This book is already in your library.");
      }

      // Add to library
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};
      const library = userData.library || [];

      await setDoc(userRef, {
        ...userData,
        library: [...library, book],
      });

      // Remove from recommendations
      await recommendationService.removeBookFromRecommendations(
        user.uid,
        book.id
      );

      // Update local state
      setLibraryBooks((prev) => [...prev, book]);
    } catch (error) {
      console.error("[LibraryContext] Error adding book:", error);
      throw error;
    }
  };

  const removeBook = async (bookId: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const updatedLibrary: GoogleBooksItem[] = (
        userData?.library || []
      ).filter((book: any) => book.id !== bookId);
      await setDoc(userRef, { library: updatedLibrary }, { merge: true });
      setLibraryBooks(updatedLibrary);
    } catch (error) {
      console.error("Error removing book from library:", error);
      throw error;
    }
  };

  const isBookInLibrary = (bookId: string) => {
    return libraryBooks.some((book: GoogleBooksItem) => book.id === bookId);
  };

  useEffect(() => {
    const loadLibrary = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        setLibraryBooks(userData?.library || ([] as GoogleBooksItem[]));
      } catch (error) {
        console.error("Error loading library:", error);
      }
    };

    loadLibrary();
    loadRecommendedBooks();
  }, [auth.currentUser]);

  return (
    <LibraryContext.Provider
      value={{
        libraryBooks,
        recommendedBooks,
        addBook,
        removeBook,
        isBookInLibrary,
        loadRecommendedBooks,
        isLoading,
        error,
        setRecommendedBooks,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
};
