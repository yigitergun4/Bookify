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

const cacheService = CacheService.getInstance();

function recentlyview() {
  const { addBook } = useLibrary();
  const [books, setBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleAddBook = async (book: any) => {
    try {
      await addBook(book);
      Alert.alert("Book added to library");
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
    const loadBooks = async () => {
      try {
        setIsLoading(true);
        const clicks = await cacheService.getRecentClicks();
        setBooks(clicks.map((click) => click.bookInfo));
      } catch (error) {
        console.error("Error loading books:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, []);

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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <>
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
        </>
      )}
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
