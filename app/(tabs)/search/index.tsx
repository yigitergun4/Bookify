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
import { router, useNavigation } from "expo-router";
import { useState } from "react";
import { searchBooksPaginated } from "@/services/booksService";
import { useFocusEffect } from "expo-router";
import React from "react";
import SearchingImage from "@/screens/searchingImage";

// make unique by id
const uniqueById = (arr: any[]): any[] => {
  const seen: Set<any> = new Set();
  return arr.filter((item: any) => {
    if (!item?.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export default function TabTwoScreen() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchingImage, setIsSearchingImage] = useState<boolean>(false);
  const navigation = useNavigation();
  const fetchBooks: (query: string, append: boolean) => Promise<void> = async (
    query: string,
    append: boolean
  ) => {
    if (!query) return;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data: any = await searchBooksPaginated(
        query,
        append ? startIndex : 0
      );
      const items: any[] = data.items || [];
      setTotalItems(data.totalItems || 0);
      if (append) {
        setBooks((prev: any[]) => uniqueById([...prev, ...items]));
      } else {
        setBooks(uniqueById(items));
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to fetch books");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  const handleSearch: (text: string) => void = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setBooks([]);
      setStartIndex(0);
      setTotalItems(0);
    }
  };

  const handleSubmit: () => void = () => {
    if (searchQuery.trim()) {
      setStartIndex(0);
      fetchBooks(searchQuery, false);
    }
  };

  const handleLoadMore: () => void = () => {
    if (books.length < totalItems) {
      setStartIndex((prev: number) => prev + 10);
      fetchBooks(searchQuery, true);
    }
  };

  const filteredBooks: any[] = uniqueById(
    books.filter((item: any) => !!item.id)
  );

  useFocusEffect(
    React.useCallback(() => {
      setBooks([]);
      setSearchQuery("");
      setStartIndex(0);
      setTotalItems(0);
    }, [])
  );

  if (isSearchingImage) {
    return <SearchingImage />;
  }

  return (
    <SafeAreaView style={[styles.container, { flex: 1 }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container2, { flex: 1 }]}>
          <>
            <View style={styles.discoverView}>
              <Text style={styles.discoverText}>Discover</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                <Image
                  source={require("@/assets/images/profile-user.png")}
                  style={styles.myProfileImage}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarView}>
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/reading")}
              >
                <Image
                  source={require("@/assets/images/book.png")}
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
              <CameraButton
                onBookDetected={(str: boolean) => setIsSearchingImage(str)}
              />
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : (
              <FlatList
                data={filteredBooks}
                keyExtractor={(item: any) => item.id}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                renderItem={({ item }: { item: any }) => {
                  const volume: any = item.volumeInfo;
                  let imageUrl: string | undefined =
                    volume.imageLinks?.thumbnail;
                  if (imageUrl?.startsWith("http:")) {
                    imageUrl = imageUrl.replace("http:", "https:");
                  }
                  return (
                    <View style={{ marginBottom: 15, backgroundColor: "#FFF" }}>
                      <BookCard
                        title={volume.title}
                        description={
                          volume.description || "No description available"
                        }
                        author={volume.authors?.[0] || "Unknown Author"}
                        image={
                          imageUrl
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
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color="#000" />
                    </View>
                  ) : null
                }
              />
            )}
          </>
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
    height: 30,
    width: 30,
  },
  booksCardContainer: {
    backgroundColor: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#FFF",
  },
  loadingMoreContainer: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFF",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
});
