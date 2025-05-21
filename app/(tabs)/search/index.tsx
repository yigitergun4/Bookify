import {
  Animated,
  Image,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text, View } from "@/components/Themed";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import ScrollView = Animated.ScrollView;
import BookCard from "@/components/SearchPageBooksCard";
import CameraButton from "@/components/CameraButton";
import { router } from "expo-router";
import { useState } from "react";

export default function TabTwoScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const PAGE_SIZE = 10;

  const fetchBooks = async (query: string, append = false) => {
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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      setStartIndex(0);
      fetchBooks(searchQuery, false);
    }
  };

  const handleLoadMore = () => {
    if (books.length < totalItems) {
      setStartIndex((prev) => prev + PAGE_SIZE);
      fetchBooks(searchQuery, true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container2}>
          <View style={styles.discoverView}>
            <Text style={styles.discoverText}>Discover</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              <Image
                source={require("@/assets/images/bookimage.png")}
                style={styles.myProfileImage}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarView}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/reading")}>
              <Image
                source={require("@/assets/images/searchpagebookicon.png")}
                style={styles.searchInputBookIcon}
              />
            </TouchableOpacity>
            <View style={styles.searchbarInputView}>
              <HomePageSearchInput
                isHomePage={false}
                onSearchChange={handleSearch}
                onSubmit={handleSubmit}
                isSubmitButtonShown={true}
              />
            </View>
            <TouchableOpacity onPress={() => {}}>
              <CameraButton />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 190 }}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } =
                nativeEvent;
              const paddingToBottom = 20;
              if (
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom
              ) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            <View style={styles.booksCardContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#000" />
                </View>
              ) : books.length > 0 ? (
                books.map((book, index) => {
                  const volume = book.volumeInfo;
                  let imageUrl = volume.imageLinks?.thumbnail;
                  if (imageUrl && imageUrl.startsWith("http:")) {
                    imageUrl = imageUrl.replace("http:", "https:");
                  }
                  return (
                    <BookCard
                      key={`${book.id}-${index}`}
                      title={book.volumeInfo.title}
                      description={
                        book.volumeInfo.description ||
                        "No description available"
                      }
                      author={book.volumeInfo.authors?.[0] || "Unknown Author"}
                      image={
                        book.volumeInfo.imageLinks?.thumbnail
                          ? {
                              uri: book.volumeInfo.imageLinks.thumbnail.replace(
                                "http://",
                                "https://"
                              ),
                            }
                          : require("@/assets/images/not-avaliable-book-photo.png")
                      }
                      bookData={book}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Search to discover books.
                  </Text>
                </View>
              )}
              {loadingMore && (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#000" />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  container2: {
    paddingHorizontal: 25,
    backgroundColor: "#FFF",
  },
  discoverView: {
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
  },
  discoverText: {
    color: "#030303",
    fontSize: 46,
    fontFamily: "Poppins",
    fontWeight: 700,
    lineHeight: 54,
  },
  myProfileImage: {
    height: 40,
    width: 40,
    borderRadius: 40,
  },
  searchBarView: {
    marginTop: 30,
    paddingBottom: 15,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    backgroundColor: "#FFF",
  },
  searchbarInputView: {
    width: "85%",
    backgroundColor: "#fff",
    paddingLeft: 13,
  },
  searchInputBookIcon: {
    height: 20,
    width: 20,
  },
  booksCardContainer: {
    gap: 15,
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingMoreContainer: {
    paddingVertical: 10,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
});
