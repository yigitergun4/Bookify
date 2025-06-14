import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { CacheService } from "@/services/cacheService";
import { getAuth } from "firebase/auth";
import { GoogleBooksItem } from "@/types/booksapitypes";

interface BookSearchListProps {
  books: any[];
  loadingMore: boolean;
  addBook: (book: any) => void;
  handleLoadMore: () => void;
  isAddButtonShown: boolean;
  onLongPressBook?: (book: any) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const BookSearchList = ({
  books,
  loadingMore,
  addBook,
  handleLoadMore,
  isAddButtonShown,
  onLongPressBook,
  refreshing = false,
  onRefresh,
}: BookSearchListProps) => {
  const cacheService: any = CacheService.getInstance();
  const auth: any = getAuth();
  const listRef: any = useRef<FlatList>(null);
  const previousOffsetY = useRef<number>(0);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [layoutHeight, setLayoutHeight] = useState<number>(0);

  const scrollToTop: () => void = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const scrollToBottom: () => void = () => {
    if (contentHeight > layoutHeight) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleScroll: (event: any) => void = (event: any) => {
    if (books.length > 40 && contentHeight > layoutHeight) {
      const offsetY: number = event.nativeEvent.contentOffset.y;
      const scrollDirection: string =
        offsetY > previousOffsetY.current ? "down" : "up";
      const atTop: boolean = offsetY <= 100;
      const atBottom: boolean = offsetY >= contentHeight - layoutHeight - 100;

      if (!atTop && !atBottom) {
        setShowScrollTop(scrollDirection === "up");
        setShowScrollBottom(scrollDirection === "down");
      } else {
        setShowScrollTop(false);
        setShowScrollBottom(false);
      }

      previousOffsetY.current = offsetY;
    }
  };

  const openModal: (book: GoogleBooksItem) => Promise<void> = async (
    book: GoogleBooksItem
  ) => {
    const user: any = auth.currentUser;
    if (user) {
      await cacheService.addBookClick(book, user.uid);
    }
    setSelectedBook(book);
    setModalVisible(true);
  };

  const closeModal: () => void = () => {
    setModalVisible(false);
    setSelectedBook(null);
  };

  let modalImageUrl: string | undefined =
    selectedBook?.volumeInfo?.imageLinks?.thumbnail;
  if (modalImageUrl && modalImageUrl?.startsWith("http:")) {
    modalImageUrl = modalImageUrl?.replace("http:", "https:");
  }

  return (
    <>
      <FlatList
        ref={listRef}
        data={books}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item: any, index: number) => `${item.id}_${index}`}
        onContentSizeChange={(w: number, h: number) => setContentHeight(h)}
        onLayout={(event: any) =>
          setLayoutHeight(event.nativeEvent.layout.height)
        }
        renderItem={({ item }: any) => {
          const volume: any = item?.volumeInfo;
          let imageUrl: string | undefined = volume?.imageLinks?.thumbnail;
          if (imageUrl && imageUrl?.startsWith("http:")) {
            imageUrl = imageUrl?.replace("http:", "https:");
          }
          return (
            <TouchableOpacity
              onPress={() => openModal(item)}
              onLongPress={() => onLongPressBook && onLongPressBook(item)}
            >
              <View style={styles.card}>
                <Image
                  source={
                    imageUrl
                      ? {
                          uri: imageUrl.startsWith("http:")
                            ? imageUrl.replace("http:", "https:")
                            : imageUrl,
                        }
                      : require("@/assets/images/not-avaliable-book-photo.png")
                  }
                  style={styles.bookImage}
                  resizeMode="contain"
                />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {volume?.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    Author: {volume?.authors?.join(", ") || "Unknown"}
                  </Text>
                  <Text style={styles.description} numberOfLines={1}>
                    Publisher: {volume?.publisher || "No publisher available."}
                  </Text>
                  <View style={styles.bookInfoRow}>
                    <Text style={styles.language} numberOfLines={1}>
                      Language: {volume?.language?.toUpperCase()}
                    </Text>
                    {isAddButtonShown && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await addBook(item);
                          } catch (err: any) {
                            if (
                              err?.message ===
                              "This book is already in your library."
                            ) {
                              Alert.alert("Error", err.message);
                            } else {
                              Alert.alert("Error", "Failed to add book.");
                            }
                          }
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Image
                          source={require("@/assets/images/addtolibrary.png")}
                          style={styles.addToLibraryIcon}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results found.</Text>
          </View>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <Image
            source={require("@/assets/images/arrow-down.png")}
            style={[
              styles.scrollTopIcon,
              { transform: [{ rotate: "180deg" }] },
            ]}
          />
        </TouchableOpacity>
      )}
      {showScrollBottom && (
        <TouchableOpacity
          style={styles.scrollBottomButton}
          onPress={scrollToBottom}
          activeOpacity={0.8}
        >
          <Image
            source={require("@/assets/images/arrow-down.png")}
            style={[styles.scrollTopIcon]}
          />
        </TouchableOpacity>
      )}
      {loadingMore && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#000" />
        </View>
      )}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={closeModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image
                source={require("@/assets/images/close.png")}
                style={styles.closeIconImage}
              />
            </TouchableOpacity>
            {selectedBook && (
              <>
                <Image
                  source={
                    modalImageUrl
                      ? {
                          uri: modalImageUrl.startsWith("http:")
                            ? modalImageUrl.replace("http:", "https:")
                            : modalImageUrl,
                        }
                      : require("@/assets/images/not-avaliable-book-photo.png")
                  }
                  style={styles.modalImage}
                  resizeMode="contain"
                />
                <Text style={styles.bookTitle}>
                  {selectedBook?.volumeInfo?.title}
                </Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Author: </Text>
                  {selectedBook?.volumeInfo?.authors?.join(", ") || "Unknown"}
                </Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Publisher: </Text>
                  {selectedBook?.volumeInfo?.publisher ||
                    "No publisher available."}
                </Text>
                <Text style={{ fontSize: 15, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Language: </Text>
                  {selectedBook?.volumeInfo?.language?.toUpperCase()}
                </Text>
                <View style={{ maxHeight: 180, marginTop: 8 }}>
                  <ScrollView>
                    <Text style={{ fontSize: 14, color: "#444" }}>
                      {selectedBook?.volumeInfo?.description ||
                        "No description available."}
                    </Text>
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
  bookInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  author: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#666",
  },
  description: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  language: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  addToLibraryIcon: {
    width: 20,
    height: 20,
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
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  closeIconImage: {
    width: 20,
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 350,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  scrollTopButton: {
    position: "absolute",
    right: 16,
    bottom: 30,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollBottomButton: {
    position: "absolute",
    right: 16,
    top: 230,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollTopIcon: {
    width: 20,
    height: 20,
  },
  modalImage: {
    width: 120,
    height: 170,
    borderRadius: 8,
    alignSelf: "center",
  },
});

export default BookSearchList;
