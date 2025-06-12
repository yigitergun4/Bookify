import { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import LogoHeader from "@/components/LogoHeader";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import BookSearchList from "@/components/BookSearchList";
import { useLibrary } from "@/contexts/LibraryContext";
import { GoogleBooksItem } from "@/types/booksapitypes";

function TabThreeScreen() {
  const [userName, setUserName] = useState<string>("");
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const user: any = FIREBASE_AUTH.currentUser;
  const { libraryBooks, removeBook, updateLibraryBooks } = useLibrary();

  const fetchUserData: () => Promise<void> = async () => {
    if (user) {
      try {
        // Fetch user data including books
        const userRef: any = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap: any = await getDoc(userRef);

        if (userSnap.exists()) {
          const data: any = userSnap.data();
          const fullName: string = data.name || "";
          const firstName: string = fullName.split(" ")[0];
          setUserName(firstName);
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load your library");
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert("Error", "Failed to load your library");
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  useEffect(() => {
    setFilteredBooks(libraryBooks);
  }, [libraryBooks]);

  const handleSearchChange: (text: string) => void = (text: string) => {
    const searchText: string = text.toLowerCase().trim();

    if (!searchText) {
      setFilteredBooks([...libraryBooks]);
      return;
    }

    const filtered: any[] = [...libraryBooks].filter((book: any) => {
      if (!book || !book.volumeInfo) return false;

      const title: string = String(book.volumeInfo.title || "").toLowerCase();
      const authors: any = Array.isArray(book.volumeInfo.authors)
        ? book.volumeInfo.authors
            .map((a: any) => String(a).toLowerCase())
            .join(" ")
        : String(book.volumeInfo.authors || "").toLowerCase();

      return title.includes(searchText) || authors.includes(searchText);
    });

    setFilteredBooks(filtered);
  };

  const handleLongPressBook: (book: any) => Promise<void> = async (
    book: any
  ) => {
    Alert.alert(
      "Remove Book",
      `Do you want to remove "${book.volumeInfo.title}" from your library?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            await removeBook(book.id);
          },
        },
      ]
    );
  };

  const onRefresh: () => Promise<void> = async () => {
    setRefreshing(true);
    try {
      // fetch books from firebase
      if (user) {
        const userRef: any = doc(FIREBASE_DB, "Users", user.uid);
        const userDoc: any = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData: any = userDoc.data();
          const books: GoogleBooksItem[] = userData.library || [];
          updateLibraryBooks(books);
          setFilteredBooks(books);
        }
      }
    } catch (error) {
      console.error("Error refreshing books:", error);
      Alert.alert("Error", "Failed to refresh books. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // unique books by id
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <LogoHeader title={"Bookify"} isProfileShown={false} />
        <View>
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>
                {userName ? `${userName}'s Library` : "Your Library"}
              </Text>
            </View>
            {libraryBooks.length > 0 && (
              <Text style={styles.bookCount}>{libraryBooks.length} books</Text>
            )}
          </View>
          <View style={styles.searchContainer}>
            <HomePageSearchInput
              isHomePage={false}
              onSearchChange={handleSearchChange}
              isSubmitButtonShown={false}
            />
          </View>
        </View>
        {libraryBooks.length > 0 && (
          <BookSearchList
            books={uniqueById(filteredBooks).reverse()}
            loadingMore={loading}
            addBook={() => {}}
            handleLoadMore={() => {}}
            isAddButtonShown={false}
            onLongPressBook={handleLongPressBook}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
        {libraryBooks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Your library is empty.</Text>
          </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  bookImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: "#eee",
  },
  bookInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  image: {
    width: 70,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    color: "#555",
  },
  description: {
    fontSize: 13,
    color: "#333",
  },
  language: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginVertical: 20,
    backgroundColor: "#fff",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  bookCount: {
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
});

export default TabThreeScreen;
