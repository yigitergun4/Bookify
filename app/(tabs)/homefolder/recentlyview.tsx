import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLibrary } from "@/contexts/LibraryContext";
import BookSearchList from "@/components/BookSearchList";
import { CacheService } from "@/services/cacheService";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { GoogleBooksItem } from "@/types/booksapitypes";

const cacheService = CacheService.getInstance();
const auth = getAuth();

function recentlyview() {
  const { addBook } = useLibrary();
  const [books, setBooks] = useState<GoogleBooksItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const user = auth.currentUser;

  const handleAddBook: (book: GoogleBooksItem) => Promise<void> = async (
    book: GoogleBooksItem
  ) => {
    try {
      await addBook(book);
      Alert.alert(
        "Add to Library",
        `Do you want to add "${book.volumeInfo.title}" to your library?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: async () => {
              try {
                await addBook(book);
                Alert.alert("Success", "Book added to your library!");
              } catch (err: any) {
                if (err?.message === "This book is already in your library.") {
                  Alert.alert("Error", err.message);
                } else {
                  Alert.alert("Error", "Failed to add book.");
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "This book is already in your library."
      ) {
        Alert.alert("This book is already in your library.");
      } else {
        Alert.alert("Error adding book to library");
      }
    }
  };

  useEffect(() => {
    const loadBooks: () => Promise<void> = async () => {
      try {
        setIsLoading(true);
        if (!user) return;
        const clicks: any[] = await cacheService.getRecentClicks(user.uid);
        setBooks(
          clicks.map((click: any) => click.bookInfo) as GoogleBooksItem[]
        );
      } catch (error) {
        console.error("Error loading books:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, [user]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Recently Viewed</Text>
          <Text style={styles.bookCount}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Recently Viewed</Text>
        <Text style={styles.bookCount}>{books.length} books</Text>
      </View>
      <BookSearchList
        books={books}
        loadingMore={false}
        addBook={handleAddBook}
        handleLoadMore={() => {}}
        isAddButtonShown={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
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
  screenTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  bookCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default recentlyview;
