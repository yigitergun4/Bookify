import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";

interface HomePageFlatlistRecentClicksProps {
  books: any[];
  onBookPress: (book: any) => void;
  closeModal: () => void;
  modalVisible: boolean;
  selectedBook: any;
  addBook: (book: any) => Promise<void>;
}

export default function HomePageFlatlistRecentClicks({
  books,
  onBookPress,
  closeModal,
  modalVisible,
  selectedBook,
  addBook,
}: HomePageFlatlistRecentClicksProps) {
  let modalImageUrl = selectedBook?.volumeInfo?.imageLinks?.thumbnail;
  if (modalImageUrl && modalImageUrl?.startsWith("http:")) {
    modalImageUrl = modalImageUrl?.replace("http:", "https:");
  }

  const handleAddToLibrary = async (book: any) => {
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
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onBookPress(item)}
          >
            <Image
              style={styles.bookImage}
              source={
                item.volumeInfo?.imageLinks?.thumbnail
                  ? { uri: item.volumeInfo.imageLinks.thumbnail }
                  : require("@/assets/images/not-avaliable-book-photo.png")
              }
            />
            <View style={styles.bookTexts}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.volumeInfo?.title}
              </Text>
              <Text style={styles.authorText} numberOfLines={1}>
                - {item.volumeInfo?.authors?.[0] || "Unknown"}
              </Text>
              <Text style={styles.languageText}>
                Language: {item.volumeInfo?.language?.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
                style={styles.iconImage}
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
                  style={styles.modalBookImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.addtolibrary}
                  onPress={() => handleAddToLibrary(selectedBook)}
                >
                  <Image
                    source={require("@/assets/images/addtolibrary.png")}
                    style={styles.iconImage}
                  />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {selectedBook?.volumeInfo?.title}
                </Text>
                <Text style={styles.bookInfoTexts}>
                  <Text style={styles.boldText}>Author: </Text>
                  {selectedBook?.volumeInfo?.authors?.join(", ") || "Unknown"}
                </Text>
                <Text style={styles.bookInfoTexts}>
                  <Text style={styles.boldText}>Publisher: </Text>
                  {selectedBook?.volumeInfo?.publisher ||
                    "No publisher available."}
                </Text>
                <Text style={styles.bookInfoTexts}>
                  <Text style={styles.boldText}>Language: </Text>
                  {selectedBook?.volumeInfo?.language?.toUpperCase()}
                </Text>
                <View style={styles.descriptionContainer}>
                  <ScrollView>
                    <Text style={styles.descriptionText}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    height: 251,
  },
  card: {
    width: 210,
    height: 250,
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  bookImage: {
    width: 210,
    height: 170,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    resizeMode: "contain",
  },
  bookTexts: {
    padding: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  authorText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  languageText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 20,
    zIndex: 10,
  },
  addtolibrary: {
    position: "absolute",
    top: "47%",
    right: 20,
    zIndex: 10,
  },
  iconImage: {
    width: 20,
    height: 20,
  },
  modalBookImage: {
    width: 120,
    height: 170,
    borderRadius: 8,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  bookInfoTexts: {
    fontSize: 15,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: "bold",
  },
  descriptionContainer: {
    maxHeight: 180,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#444",
  },
});
