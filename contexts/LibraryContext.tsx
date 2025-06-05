import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { RecommendationService } from "@/services/recommendationService";
import { CacheService } from "@/services/cacheService";

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

      console.log(
        "[LibraryContext] Firebase docs count:",
        recommendationsSnap.docs.length
      );

      if (!recommendationsSnap.empty) {
        const firebaseBooks = recommendationsSnap.docs
          .map((doc) => {
            const data = doc.data();
            console.log("[LibraryContext] Doc data:", {
              id: doc.id,
              booksCount: data.books?.length || 0,
              chunkIndex: data.chunkIndex,
              totalBooks: data.totalBooks,
            });
            return data.books;
          })
          .flat();

        console.log(
          "[LibraryContext] Total books from Firebase:",
          firebaseBooks.length
        );

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
      const cachedBooks = await cacheService.getRecommendedBooks(user.uid);
      console.log("[LibraryContext] Books in cache:", cachedBooks?.length || 0);

      if (cachedBooks && cachedBooks.length > 0) {
        setRecommendedBooks(cachedBooks);
      } else {
        // if cache is empty, fetch new recommendations
        const newBooks = await recommendationService.getRecommendations(
          user.uid
        );
        console.log("[LibraryContext] Fetched new books:", newBooks.length);

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
    if (!user) return;

    try {
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (userData?.library?.some((b: any) => b.id === book.id)) {
        throw new Error("This book is already in your library.");
      }

      const updatedLibrary = [...(userData?.library || []), book];
      await setDoc(userRef, { library: updatedLibrary }, { merge: true });
      setLibraryBooks(updatedLibrary);

      // After adding a book, update recommendations based on the new library
      const userDataAfterUpdate = await getDoc(userRef);
      const updatedUserData = userDataAfterUpdate.data();

      // Get user's preferences and updated library
      const favoriteGenres = updatedUserData?.favoriteGenres || [];
      const favoriteBooks = updatedUserData?.favoriteBooks || [];
      const readBooks = updatedUserData?.readBooks || [];
      const libraryBooks = updatedUserData?.library || [];

      // Get new recommendations based on updated preferences
      const newRecommendations = await recommendationService.getRecommendations(
        user.uid,
        {
          favoriteGenres,
          favoriteBooks,
          readBooks,
          libraryBooks,
        }
      );

      // Save new recommendations
      await recommendationService.saveRecommendations(
        user.uid,
        newRecommendations
      );

      // Update context with new recommendations
      setRecommendedBooks(newRecommendations);

      // Update cache
      await cacheService.saveRecommendedBooks(user.uid, newRecommendations);
    } catch (error) {
      console.error("Error adding book to library:", error);
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

      const updatedLibrary = (userData?.library || []).filter(
        (book: any) => book.id !== bookId
      );
      await setDoc(userRef, { library: updatedLibrary }, { merge: true });
      setLibraryBooks(updatedLibrary);
    } catch (error) {
      console.error("Error removing book from library:", error);
      throw error;
    }
  };

  const isBookInLibrary = (bookId: string) => {
    return libraryBooks.some((book) => book.id === bookId);
  };

  useEffect(() => {
    const loadLibrary = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();
        setLibraryBooks(userData?.library || []);
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
