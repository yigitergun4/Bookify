import { useLocalSearchParams } from "expo-router";
import { useLibrary } from "@/contexts/LibraryContext";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";

const PAGE_SIZE = 10;

export default function SearchResultsScreen() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const { addBook } = useLibrary();

  const fetchBooks = async (append = false) => {
    if (!query) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&startIndex=${append ? startIndex : 0}&maxResults=${PAGE_SIZE}`
      );
      const data = await response.json();
      const items = data.items || [];
      setTotalItems(data.totalItems || 0);
      if (append) {
        setBooks((prev) => [...prev, ...items]);
      } else {
        setBooks(items);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to fetch books");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    setStartIndex(0);
    fetchBooks(false);
  }, [query]);

  const handleLoadMore = () => {
    if (books.length < totalItems) {
      setStartIndex((prev) => prev + PAGE_SIZE);
      fetchBooks(true);
    }
  };

  const handleAddBook = async (book: any) => {
    Alert.alert(
      "Add to Library",
      "Do you want to add this book to your library?",
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
  };

  useEffect(() => {
    if (startIndex !== 0) {
      fetchBooks(true);
    }
  }, [startIndex]);

  // make unique by id
  function uniqueById(arr: any[]) {
    const seen = new Set();
    return arr.filter((item) => {
      if (!item?.id) return false;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Search Results</Text>
        <Text style={styles.subtitle}>Results for “{query}”</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <>
          <BookSearchList
            books={uniqueById(books)}
            loadingMore={loadingMore}
            addBook={handleAddBook}
            handleLoadMore={handleLoadMore}
            isAddButtonShown={true}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
