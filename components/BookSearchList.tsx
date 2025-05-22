import { useState } from "react";
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
} from "react-native";

interface BookSearchListProps {
  books: any[];
  loadingMore: boolean;
  addBook: (book: any) => void;
  handleLoadMore: () => void;
  isAddButtonShown: boolean;
  onLongPressBook?: (book: any) => void;
}

const BookSearchList = ({
  books,
  loadingMore,
  addBook,
  handleLoadMore,
  isAddButtonShown,
  onLongPressBook,
}: BookSearchListProps) => {
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = (book: any) => {
    setSelectedBook(book);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBook(null);
  };

  let modalImageUrl = selectedBook?.volumeInfo?.imageLinks?.thumbnail;
  if (modalImageUrl && modalImageUrl?.startsWith("http:")) {
    modalImageUrl = modalImageUrl?.replace("http:", "https:");
  }
  console.log(
    books.map((book) => book?.volumeInfo?.title),
    "bookss BookSearchList:48"
  );
  return (
    <>
      <FlatList
        data={books.reverse()}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item, index) =>
          item.id ? item.id + "-" + index : index.toString()
        }
        renderItem={({ item }) => {
          const volume = item?.volumeInfo;
          let imageUrl = volume?.imageLinks?.thumbnail;
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
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.language} numberOfLines={1}>
                      Language: {volume?.language?.toUpperCase()}
                    </Text>
                    {isAddButtonShown && (
                      <TouchableOpacity onPress={() => addBook(item)}>
                        <Image
                          source={require("@/assets/images/addtolibrary.png")}
                          style={{ width: 20, height: 20 }}
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
        onEndReachedThreshold={0.5}
      />
      {loadingMore && (
        <View style={{ padding: 16, alignItems: "center" }}>
          <ActivityIndicator color="#222" />
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
                style={{ width: 20, height: 20 }}
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
                  style={{
                    width: 120,
                    height: 170,
                    borderRadius: 8,
                    alignSelf: "center",
                    marginBottom: 16,
                  }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    marginBottom: 8,
                    textAlign: "center",
                  }}
                >
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
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
});

export default BookSearchList;
