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
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { searchBooksForResults } from "@/services/booksService";

export default function SearchResultsScreen() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [userCountry, setUserCountry] = useState<string>("Turkey"); // Default to Turkey
  const PAGE_SIZE: number = 10;
  const { addBook } = useLibrary();
  const user = FIREBASE_AUTH.currentUser;

  // Get user country from Firebase
  const getUserCountry = async (): Promise<string> => {
    if (!user) return "Turkey"; // Default country
    try {
      const userDoc = await getDoc(doc(FIREBASE_DB, "Users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.country || "Turkey";
      }
    } catch (error) {
      console.error("Error getting user country:", error);
    }
    return "Turkey"; // Default fallback
  };

  // Load user country on component mount
  useEffect(() => {
    const loadUserCountry = async () => {
      const country = await getUserCountry();
      setUserCountry(country);
    };
    loadUserCountry();
  }, [user]);

  const fetchBooks: (append: boolean) => Promise<void> = async (
    append: boolean
  ) => {
    if (!query) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await searchBooksForResults(
        query,
        append ? startIndex : 0,
        PAGE_SIZE,
        userCountry
      );

      setTotalItems(result.totalItems);

      if (append) {
        setBooks((prev: any[]) => [...prev, ...result.items]);
      } else {
        setBooks(result.items);
      }
    } catch (err: any) {
      console.error("Error fetching books:", err);
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

  const handleLoadMore: () => void = () => {
    if (books.length < totalItems) {
      setStartIndex((prev: number) => prev + PAGE_SIZE);
      fetchBooks(true);
    }
  };

  const handleAddBook: (book: any) => Promise<void> = async (book: any) => {
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
  };

  useEffect(() => {
    if (startIndex !== 0) {
      fetchBooks(true);
    }
  }, [startIndex]);

  // make unique by id
  function uniqueById(arr: any[]): any[] {
    const seen: Set<any> = new Set();
    return arr.filter((item: any) => {
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
          <ActivityIndicator size="large" color="gray" />
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
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    zIndex: 1000,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
