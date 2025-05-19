import { useLocalSearchParams } from "expo-router";
import { useLibrary } from "@/contexts/LibraryContext";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
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
      console.error("Google Books API error:", err);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    setStartIndex(0);
    fetchBooks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleLoadMore = () => {
    if (books.length < totalItems) {
      setStartIndex((prev) => prev + PAGE_SIZE);
      fetchBooks(true);
    }
  };

  useEffect(() => {
    if (startIndex !== 0) {
      fetchBooks(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIndex]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Search Results</Text>
        <Text style={styles.subtitle}>Results for “{query}”</Text>
      </View>
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 20, color: "#888" }}>Loading...</Text>
        </View>
      ) : (
        <>
          <BookSearchList
            books={books}
            loadingMore={loadingMore}
            addBook={addBook}
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
});
