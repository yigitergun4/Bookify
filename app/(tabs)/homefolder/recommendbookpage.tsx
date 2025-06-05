import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { useState, useEffect } from "react";
import { CacheService } from "@/services/cacheService";
import { getAuth } from "firebase/auth";
import { RecommendationService } from "@/services/recommendationService";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { useLibrary } from "@/contexts/LibraryContext";

const cacheService = CacheService.getInstance();
const auth = getAuth();
const recommendationService = RecommendationService.getInstance();

const RecommendedScreen = () => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;
  const {
    addBook,
    libraryBooks,
    recommendedBooks,
    loadRecommendedBooks,
    isLoading,
  } = useLibrary();

  const handleAddBook = async (book: any) => {
    if (!user) return;

    Alert.alert(
      "Add to Library",
      `Would you like to add "${book.volumeInfo.title}" to your library?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Add",
          onPress: async () => {
            try {
              await addBook(book);
              Alert.alert("Success", "Book added to your library!");
            } catch (error: any) {
              if (error?.message === "This book is already in your library.") {
                Alert.alert("Error", error.message);
              } else {
                Alert.alert(
                  "Error",
                  "Failed to add book to library. Please try again."
                );
              }
            }
          },
        },
      ]
    );
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !user) return;
    setIsLoadingMore(true);
    setError(null);

    try {
      // Get existing book IDs to avoid duplicates
      const existingBookIds = new Set(recommendedBooks.map((book) => book.id));
      console.log(
        "[RecommendedScreen] Existing book count:",
        existingBookIds.size
      );

      // Get user's favorite genres and books for better recommendations
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const favoriteGenres = userData?.favoriteGenres || [];
      const favoriteBooks = userData?.favoriteBooks || [];
      const readBooks = userData?.readBooks || [];
      let newBooks: any[] = [];

      // Get library book IDs
      const libraryBookIds = new Set(libraryBooks.map((book: any) => book.id));

      // If we've loaded more than 40 books, try different search strategies
      if (recommendedBooks.length >= 40) {
        try {
          // Get ChatGPT recommendations
          const queries = await recommendationService.getChatGPTRecommendations(
            favoriteGenres,
            favoriteBooks,
            readBooks
          );

          // Try all generated queries and combine results
          let allNewBooks: any[] = [];
          for (const query of queries) {
            const books =
              await recommendationService.searchBooksWithQuery(query);
            if (books.length > 0) {
              allNewBooks = [...allNewBooks, ...books];
            }
          }

          // Remove duplicates and filter out existing books
          const uniqueNewBooks = Array.from(
            new Map(
              allNewBooks
                .filter(
                  (book) =>
                    !existingBookIds.has(book.id) &&
                    !libraryBookIds.has(book.id)
                )
                .map((book) => [book.id, book])
            ).values()
          );

          if (uniqueNewBooks.length > 0) {
            newBooks = uniqueNewBooks;
            console.log(
              "Found new books from all queries:",
              uniqueNewBooks.length
            );
          }
        } catch (error) {
          console.error("Error getting recommendations from ChatGPT:", error);
          // Fallback to random genre if ChatGPT fails
          if (favoriteGenres.length > 0) {
            const randomGenre =
              favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)];
            newBooks = await recommendationService.searchBooksWithQuery(
              `subject:${randomGenre}`
            );
          }
        }
      } else {
        // Normal search with all preferences
        newBooks = await recommendationService.searchBooksWithQuery(
          [...favoriteGenres, ...favoriteBooks].join(" ")
        );
      }

      // Filter out books that are already in the list or in the library
      const uniqueNewBooks = newBooks.filter(
        (book: any) =>
          !existingBookIds.has(book.id) && !libraryBookIds.has(book.id)
      );
      console.log(
        "[RecommendedScreen] Unique new books:",
        uniqueNewBooks.length
      );

      if (uniqueNewBooks.length === 0) {
        setError("No more books to recommend at this time.");
        setIsLoadingMore(false);
        return;
      }

      // Save new books to Firebase using subcollection structure
      await recommendationService.saveRecommendations(user.uid, uniqueNewBooks);

      // Reload recommended books to get the updated list
      await loadRecommendedBooks();
    } catch (error) {
      console.error(
        "[RecommendedScreen] Error loading more recommendations:",
        error
      );
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to load more recommendations. Please try again.");
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>Recommended for you</Text>
            <Text style={styles.countBooksText}>
              {recommendedBooks.length} books
            </Text>
          </View>
          <BookSearchList
            books={recommendedBooks}
            loadingMore={isLoadingMore}
            addBook={handleAddBook}
            handleLoadMore={handleLoadMore}
            isAddButtonShown={true}
          />
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default RecommendedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  countBooksText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Poppins-Regular",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    right: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});
