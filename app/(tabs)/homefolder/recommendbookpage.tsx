import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { useState } from "react";
import { getAuth } from "firebase/auth";
import { RecommendationService } from "@/services/recommendationService";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { useLibrary } from "@/contexts/LibraryContext";
import SearchInput from "@/components/HomePageSearchInput";

const auth = getAuth();
const recommendationService = RecommendationService.getInstance();

const RecommendedScreen = () => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const user = auth.currentUser;
  const {
    addBook,
    libraryBooks,
    recommendedBooks,
    isLoading,
    setRecommendedBooks,
  } = useLibrary();

  // Filter books based on search query
  const filteredBooks = recommendedBooks.filter((book) => {
    const title = book.volumeInfo?.title?.toLowerCase() || "";
    const authors = book.volumeInfo?.authors?.join(" ")?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return title.includes(query) || authors.includes(query);
  });

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
    if (isLoadingMore || !user || searchQuery.trim() !== "") return;
    setIsLoadingMore(true);
    setError(null);

    try {
      // Get existing book IDs to avoid duplicates
      const existingBookIds = new Set(recommendedBooks.map((book) => book.id));
      console.log(
        "[RecommendedScreen] Existing book count:",
        existingBookIds.size
      );

      // Get all previously recommended books from Firebase
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        user.uid,
        "Recommendations"
      );
      const recommendationsSnap = await getDocs(recommendationsRef);
      const previouslyRecommendedIds = new Set<string>();

      recommendationsSnap.docs.forEach((doc) => {
        const books = doc.data().books || [];
        books.forEach((book: any) => previouslyRecommendedIds.add(book.id));
      });

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
        console.log(
          "[RecommendedScreen] Using ChatGPT recommendations (40+ books)"
        );
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
                    !libraryBookIds.has(book.id) &&
                    !previouslyRecommendedIds.has(book.id)
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
        console.log(
          "[RecommendedScreen] Using regular recommendations (<40 books)"
        );
        // Normal search with all preferences
        newBooks = await recommendationService.searchBooksWithQuery(
          [...favoriteGenres, ...favoriteBooks].join(" ")
        );
      }

      // Filter out books that are already in the list, library, or previously recommended
      const uniqueNewBooks = newBooks.filter(
        (book: any) =>
          !existingBookIds.has(book.id) &&
          !libraryBookIds.has(book.id) &&
          !previouslyRecommendedIds.has(book.id)
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

      // Limit to 20 books per load
      const limitedNewBooks = uniqueNewBooks.slice(0, 20);

      // Save new books to Firebase using subcollection structure
      await recommendationService.saveRecommendations(
        user.uid,
        limitedNewBooks
      );

      // Update the recommended books list by appending new books
      setRecommendedBooks((prev) => [...prev, ...limitedNewBooks]);
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
          <View style={styles.searchContainer}>
            <SearchInput
              isHomePage={false}
              value={searchQuery}
              onSearchChange={setSearchQuery}
              isSubmitButtonShown={false}
            />
          </View>
          <BookSearchList
            books={filteredBooks}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
