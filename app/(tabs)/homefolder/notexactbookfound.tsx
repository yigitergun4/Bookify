import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { useLibrary } from "@/contexts/LibraryContext";
import { getAuth } from "firebase/auth";

const auth = getAuth();
const NotExactBookFound = () => {
  const { books } = useLocalSearchParams();
  const { addBook } = useLibrary();
  const user = auth.currentUser;
  let listOfBooks: GoogleBooksItem[] = [];

  const handleAddBook: (book: any) => Promise<void> = async (book: any) => {
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

  try {
    if (typeof books === "string") {
      listOfBooks = JSON.parse(books);
    }
  } catch (e) {
    console.error("Error parsing books:", e);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/search")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require("@/assets/images/arrow-left.png")}
            style={{ width: 15, height: 15 }}
          />
        </TouchableOpacity>
        <View>
          <Text style={styles.screenTitle}>Couldn't find an exact match.</Text>
          <Text>See similar books below.</Text>
        </View>
      </View>
      {listOfBooks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No similar books found.</Text>
          <Text style={styles.emptyText}>Please try manual search.</Text>
        </View>
      ) : (
        <BookSearchList
          books={listOfBooks.slice(0, 40)}
          loadingMore={false}
          addBook={handleAddBook}
          handleLoadMore={() => {}}
          isAddButtonShown={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingHorizontal: 15,
    gap: 20,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});

export default NotExactBookFound;
