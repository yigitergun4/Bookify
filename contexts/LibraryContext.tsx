import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { RecommendationService } from "@/services/recommendationService";
import { CacheService } from "@/services/cacheService";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { removeDuplicateBooks, shuffleBooks } from "@/utils/bookUtils";

const cacheService = CacheService.getInstance();
const recommendationService = RecommendationService.getInstance();

export const COUNTRIES: string[] = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "South Korea",
  "India",
  "Brazil",
  "Mexico",
  "Turkey",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Russia",
  "China",
  "Singapore",
  "New Zealand",
  "South Africa",
  "Argentina",
];

export const GENRES = [
  "Fiction",
  "Mystery",
  "Novel",
  "Thriller",
  "Fantasy",
  "Biography",
  "Self-help",
  "Science fiction",
  "Children's",
  "Non-fiction",
  "Historical",
  "Crime fiction",
  "Travelogue",
  "Technology & Science",
  "Historical fiction",
  "Inspirational",
  "Wellness",
  "Sports",
  "Horror",
  "Dystopian",
  "Adventure",
  "Drama",
  "Poetry",
  "Philosophy",
  "Art",
];

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
  clearRecommendedBooks: () => void;
  updateLibraryBooks: (books: any[]) => void;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const auth: any = getAuth();

  const updateLibraryBooks: (books: GoogleBooksItem[]) => void = (
    books: GoogleBooksItem[]
  ) => {
    setLibraryBooks(books);
  };

  const clearRecommendedBooks = () => {
    setRecommendedBooks([]);
  };

  const loadRecommendedBooks = async () => {
    const user: any = auth.currentUser;
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
            const data: any = doc.data();
            return data.books;
          })
          .flat();
        if (firebaseBooks.length > 0) {
          // Remove duplicates by book ID
          const uniqueBooks = removeDuplicateBooks(firebaseBooks);
          // Shuffle the books
          const shuffledBooks: GoogleBooksItem[] = shuffleBooks(uniqueBooks);
          setRecommendedBooks(shuffledBooks);
          // Also update cache with shuffled books
          await cacheService.saveRecommendedBooks(user.uid, shuffledBooks);
          return;
        }
      }

      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const userCountry: string = userData?.country || "";

      const queries: string[] =
        await recommendationService.getChatGPTRecommendations(
          userData?.favoriteGenres || [],
          userData?.favoriteBooks || [],
          userData?.libraryBooks || [],
          userData?.goal || undefined,
          userData?.favoriteAuthors || [],
          userCountry
        );
      const newBooks: GoogleBooksItem[] = await Promise.all(
        queries.map((query: string) =>
          recommendationService.searchBooksWithQuery(query, userCountry)
        )
      ).then((results) => results.flat());

      // Remove duplicates by book ID
      const uniqueNewBooks = removeDuplicateBooks(newBooks);

      setRecommendedBooks(uniqueNewBooks);
      // save to both cache and firebase
      await cacheService.saveRecommendedBooks(user.uid, uniqueNewBooks);
      await recommendationService.saveRecommendations(user.uid, uniqueNewBooks);
    } catch (error) {
      console.log("[LibraryContext] Error loading recommended books:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addBook: (book: GoogleBooksItem) => Promise<void> = async (
    book: GoogleBooksItem
  ) => {
    const user: any = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    try {
      // Check if book is already in library
      if (isBookInLibrary(book.id)) {
        throw new Error("This book is already in your library.");
      }

      // Add to library
      const userRef: any = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap: any = await getDoc(userRef);
      const userData: any = userSnap.data() || {};
      const library: GoogleBooksItem[] = userData.library || [];

      await setDoc(userRef, {
        ...userData,
        library: [...library, book],
      });

      // Update local state
      setLibraryBooks((prev) => [...prev, book]);
    } catch (error) {
      console.log("[LibraryContext] Error adding book:", error);
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
        clearRecommendedBooks,
        updateLibraryBooks,
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
