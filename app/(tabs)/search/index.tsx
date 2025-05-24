import {
  Image,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { Text, View } from "@/components/Themed";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import BookCard from "@/components/SearchPageBooksCard";
import CameraButton from "@/components/CameraButton";
import { router } from "expo-router";
import { useState } from "react";
import { searchBooksPaginated } from "@/services/booksService";
import { useFocusEffect } from "expo-router";
import React from "react";
import { CacheService } from "@/services/cacheService";
import { Timestamp } from "@react-native-firebase/firestore";

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

export default function TabTwoScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBooks = async (query: string, append = false) => {
    if (!query) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = await searchBooksPaginated(query, append ? startIndex : 0);
      const items = data.items || [];
      setTotalItems(data.totalItems || 0);
      if (append) {
        setBooks((prev) => uniqueById([...prev, ...items]));
      } else {
        setBooks(uniqueById(items));
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
    if (text.trim() === "") {
      setBooks([]);
      setStartIndex(0);
      setTotalItems(0);
    }
  };

  const handleSubmit = () => {
    if (searchQuery.trim()) {
      setStartIndex(0);
      fetchBooks(searchQuery, false);
    }
  };

  const handleLoadMore = () => {
    if (books.length < totalItems) {
      setStartIndex((prev) => prev + 10);
      fetchBooks(searchQuery, true);
    }
  };

  const filteredBooks = uniqueById(books.filter((item) => !!item.id));

  useFocusEffect(
    React.useCallback(() => {
      setBooks([]);
      setSearchQuery("");
      setStartIndex(0);
      setTotalItems(0);
    }, [])
  );

  console.log(CacheService.getInstance());
  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container2, { flex: 1 }]}>
          <View style={styles.discoverView}>
            <Text style={styles.discoverText}>Discover</Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/profile/index")}
            >
              <Image
                source={require("@/assets/images/bookimage.png")}
                style={styles.myProfileImage}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarView}>
            <TouchableOpacity onPress={() => {}}>
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
                value={searchQuery}
              />
            </View>
            <CameraButton />
          </View>
          {/* loading spinner while books are loading */}
          {loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#000" />
            </View>
          ) : (
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              renderItem={({ item }) => {
                const volume = item.volumeInfo;
                let imageUrl = volume.imageLinks?.thumbnail;
                if (imageUrl && imageUrl.startsWith("http:")) {
                  imageUrl = imageUrl.replace("http:", "https:");
                }
                return (
                  <View style={{ marginBottom: 15 }}>
                    <BookCard
                      title={volume.title}
                      description={
                        volume.description || "No description available"
                      }
                      author={volume.authors?.[0] || "Unknown Author"}
                      image={
                        volume.imageLinks?.thumbnail
                          ? { uri: imageUrl }
                          : require("@/assets/images/not-avaliable-book-photo.png")
                      }
                      bookData={item}
                    />
                  </View>
                );
              }}
              contentContainerStyle={styles.booksCardContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    Search to discover books.
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <View
                    style={[styles.loadingMoreContainer, { minHeight: 60 }]}
                  >
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                ) : (
                  <View style={{ height: 30 }} />
                )
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
            />
          )}
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
