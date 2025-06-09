import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { GoogleBooksItem } from "@/types/booksapitypes";

const NotExactBookFound = () => {
  const { books } = useLocalSearchParams();
  let listOfBooks: GoogleBooksItem[] = [];

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
        <TouchableOpacity onPress={() => router.replace("/(tabs)/search")}>
          <Image
            source={require("@/assets/images/arrow-left.png")}
            style={{ width: 26, height: 26 }}
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
          books={listOfBooks}
          loadingMore={false}
          addBook={() => {}}
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
    paddingTop: 20,
    paddingHorizontal: 10,
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
