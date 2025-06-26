import { useState, useRef, useCallback, memo } from "react";
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
  books: GoogleBooksItem[];
  loadingMore: boolean;
  addBook: (book: GoogleBooksItem) => void;
  handleLoadMore: () => void;
  isAddButtonShown: boolean;
  onLongPressBook?: (book: GoogleBooksItem) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  searchQuery?: string;
}

// Memoized Book Item Component
const BookItem = memo(
  ({
    item,
    onPress,
    onLongPress,
    onAddBook,
    isAddButtonShown,
  }: {
    item: GoogleBooksItem;
    onPress: (book: GoogleBooksItem) => void;
    onLongPress?: (book: GoogleBooksItem) => void;
    onAddBook: (book: GoogleBooksItem) => void;
    isAddButtonShown: boolean;
  }) => {
    const volume = item?.volumeInfo;
    const imageUrl = volume?.imageLinks?.thumbnail?.replace("http:", "https:");

    return (
      <TouchableOpacity
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress && onLongPress(item)}
      >
        <View style={styles.card}>
          <Image
            source={
              imageUrl
                ? { uri: imageUrl }
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
                  onPress={() => onAddBook(item)}
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
  }
);

const BookSearchList = ({
  books,
  loadingMore,
  addBook,
  handleLoadMore,
  isAddButtonShown,
  onLongPressBook,
  refreshing = false,
  onRefresh,
  searchQuery = "",
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

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const scrollToBottom = useCallback(() => {
    if (books.length > 0) {
      // With getItemLayout, scrollToIndex is now precise and efficient
      listRef.current?.scrollToIndex({
        index: books.length - 1,
        viewPosition: 1, // Position item at bottom of viewport
        animated: true,
      });
    }
  }, [books.length]);

  const handleScroll = useCallback(
    (event: any) => {
      // Don't show scroll buttons if there's a search query
      if (searchQuery && searchQuery.trim().length > 0) {
        setShowScrollTop(false);
        setShowScrollBottom(false);
        return;
      }

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
    },
    [books.length, contentHeight, layoutHeight, searchQuery]
  );

  const openModal = useCallback(
    async (book: GoogleBooksItem) => {
      const user: any = auth.currentUser;
      if (user) {
        await cacheService.addBookClick(book, user.uid);
      }
      setSelectedBook(book);
      setModalVisible(true);
    },
    [auth, cacheService]
  );

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedBook(null);
  }, []);

  const handleAddBook = useCallback(
    async (book: GoogleBooksItem) => {
      try {
        await addBook(book);
      } catch (err: any) {
        if (err?.message === "This book is already in your library.") {
          Alert.alert("Error", err.message);
        } else {
          Alert.alert("Error", "Failed to add book.");
        }
      }
    },
    [addBook]
  );

  const renderItem = useCallback(
    ({ item }: { item: GoogleBooksItem }) => (
      <BookItem
        item={item}
        onPress={openModal}
        onLongPress={onLongPressBook}
        onAddBook={handleAddBook}
        isAddButtonShown={isAddButtonShown}
      />
    ),
    [openModal, onLongPressBook, handleAddBook, isAddButtonShown]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => item.id || `book_${index}`,
    []
  );

  // Define item layout for better scroll performance and accuracy
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: 132, // height of each book item (100px image + 32px margin/padding)
      offset: 132 * index + 12, // +12 for top padding
      index,
    }),
    []
  );

  // Handle scroll to index failures
  const onScrollToIndexFailed = useCallback((info: any) => {
    // If scrollToIndex fails, fall back to scrollToEnd
    console.log("ScrollToIndex failed, falling back to scrollToEnd:", info);
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const modalImageUrl =
    selectedBook?.volumeInfo?.imageLinks?.thumbnail?.replace("http:", "https:");

  return (
    <>
      <FlatList
        ref={listRef}
        data={books}
        contentContainerStyle={styles.listContent}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onContentSizeChange={(w: number, h: number) => setContentHeight(h)}
        onLayout={(event: any) =>
          setLayoutHeight(event.nativeEvent.layout.height)
        }
        renderItem={renderItem}
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
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
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
                      ? { uri: modalImageUrl }
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

export default memo(BookSearchList);
