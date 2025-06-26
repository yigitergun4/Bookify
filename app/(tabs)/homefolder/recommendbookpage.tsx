import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { useState } from "react";
import { getAuth } from "firebase/auth";
import { RecommendationService } from "@/services/recommendationService";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  CollectionReference,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentReference,
} from "firebase/firestore";
import { FIREBASE_DB } from "@/FirebaseConfig";
import { useLibrary } from "@/contexts/LibraryContext";
import SearchInput from "@/components/HomePageSearchInput";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { UserGoal } from "@/types/usersdatatypes";
import { removeDuplicateBooks, filterUniqueBooks } from "@/utils/bookUtils";

const auth = getAuth();
const recommendationService = RecommendationService.getInstance();

const RecommendedScreen = () => {
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const user = auth.currentUser;
  const { addBook, recommendedBooks, isLoading, setRecommendedBooks } =
    useLibrary();
  // Filter books based on search query
  const filteredBooks: GoogleBooksItem[] = recommendedBooks.filter(
    (book: GoogleBooksItem) => {
      const title: string = book.volumeInfo?.title?.toLowerCase() || "";
      const authors: string =
        book.volumeInfo?.authors?.join(" ")?.toLowerCase() || "";
      const query: string = searchQuery.toLowerCase();
      return title.includes(query) || authors.includes(query);
    }
  );

  const handleAddBook: (book: GoogleBooksItem) => Promise<void> = async (
    book: GoogleBooksItem
  ) => {
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

  const handleLoadMore: () => Promise<void> = async () => {
    if (isLoadingMore || !user || searchQuery.trim() !== "") return;
    setIsLoadingMore(true);
    setError(null);
    console.log("handleLoadMore: recommendbookpage.tsx:73");
    try {
      // Get existing book IDs to avoid duplicates
      const existingBookIds: Set<string> = new Set(
        recommendedBooks.map((book: GoogleBooksItem) => book.id)
      );
      console.log(
        "[RecommendedScreen] Existing book count:",
        existingBookIds.size
      );
      // Get all previously recommended books from Firebase
      const recommendationsRef: CollectionReference<DocumentData> = collection(
        FIREBASE_DB,
        "Users",
        user.uid,
        "Recommendations"
      );
      const recommendationsSnap: QuerySnapshot<DocumentData> =
        await getDocs(recommendationsRef);
      const previouslyRecommendedIds: Set<string> = new Set<string>();

      recommendationsSnap.docs.forEach(
        (doc: QueryDocumentSnapshot<DocumentData>) => {
          const books: GoogleBooksItem[] = doc.data().books || [];
          books.forEach((book: GoogleBooksItem) =>
            previouslyRecommendedIds.add(book.id)
          );
        }
      );
      // Get user's favorite genres and books for better recommendations
      const userRef: DocumentReference<DocumentData> = doc(
        FIREBASE_DB,
        "Users",
        user.uid
      );
      const userSnap: any = await getDoc(userRef);
      const userData: any = userSnap.data();
      const favoriteGenres: string[] = userData?.favoriteGenres || [];
      const favoriteBooks: string[] = userData?.favoriteBooks || [];
      const libraryBooks: GoogleBooksItem[] = userData?.library || [];
      const favoriteAuthors: string =
        userData?.favoriteAuthors?.join(", ") || "";
      const unforgettableBook: string = userData?.unforgettableBook || "";
      const userCountry: string = userData?.country || "";
      const userGoal: UserGoal = {
        id: userData?.goal?.id || "",
        title: userData?.goal?.title || "",
        searchStrategy: userData?.goal?.searchStrategy || "",
        categories: userData?.goal?.categories || [],
        description: userData?.userGoal?.description || "",
      };
      let newBooks: GoogleBooksItem[] = [];
      // Get library book ID's
      const libraryBookIds: Set<string> = new Set(
        libraryBooks.map((book: GoogleBooksItem) => book.id)
      );
      if (libraryBooks.length > 0) {
        try {
          // Get ChatGPT recommendations
          const queries: string[] =
            await recommendationService.getChatGPTRecommendationsForLoadMore(
              libraryBooks,
              userGoal,
              favoriteGenres,
              unforgettableBook,
              userCountry
            );
          // Try all generated queries and combine results
          const queryResults: GoogleBooksItem[][] = await Promise.all(
            queries.map(async (query: string) => {
              try {
                return await recommendationService.searchBooksWithQuery(
                  query,
                  userCountry
                );
              } catch (error) {
                console.log(`Failed to fetch books for query: ${query}`, error);
                return [];
              }
            })
          );
          newBooks = queryResults.flat();

          // Remove duplicates by book ID from the new books
          newBooks = removeDuplicateBooks(newBooks);

          // If we got no results, try genre-based search
          if (newBooks.length === 0 && favoriteGenres.length > 0) {
            console.log(
              "No results from ChatGPT queries, falling back to genre search"
            );
            const randomGenre: string =
              favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)];
            newBooks = await recommendationService.searchBooksWithQuery(
              `subject:${randomGenre}`,
              userCountry
            );
          }
        } catch (error) {
          console.error("Error in recommendation process:", error);
          // Fallback to genre-based search if ChatGPT fails
          if (favoriteGenres.length > 0) {
            const randomGenre: string =
              favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)];
            newBooks = await recommendationService.searchBooksWithQuery(
              `subject:${randomGenre}`,
              userCountry
            );
          }
        }
      } else {
        // Initial genre-based search
        console.log("Initial genre-based search");
        const randomGenre: string =
          favoriteGenres[Math.floor(Math.random() * favoriteGenres.length)];
        try {
          newBooks = await recommendationService.searchBooksWithQuery(
            `subject:${randomGenre}&country:${userCountry}&maxResults=20&orderBy=relevance`,
            userCountry
          );
        } catch (error) {
          console.error("Error in genre-based search:", error);
        }
      }

      // Filter out books that are already in the list, library, or previously recommended
      const uniqueNewBooks: GoogleBooksItem[] = filterUniqueBooks(
        newBooks,
        existingBookIds,
        libraryBookIds,
        previouslyRecommendedIds
      );

      if (uniqueNewBooks.length === 0) {
        Alert.alert(
          "No more books to recommend at this time.",
          "Please add some books to your library to get more recommendations"
        );
        setIsLoadingMore(false);
        return;
      }

      // Save new books to Firebase using subcollection structure
      await recommendationService.saveRecommendations(user.uid, uniqueNewBooks);

      // Update the recommended books list by appending new books
      setRecommendedBooks((prev: GoogleBooksItem[]) => [
        ...prev,
        ...uniqueNewBooks,
      ]);
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
            searchQuery={searchQuery}
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
    paddingTop: Platform.OS === "ios" ? 20 : 30,
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
    fontSize: Platform.OS === "ios" ? 26 : 20,
    fontWeight: "bold",
    color: "#222",
  },
  countBooksText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Poppins-Regular",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
