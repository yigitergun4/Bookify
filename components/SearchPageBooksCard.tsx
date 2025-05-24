import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from "react-native";
import { useLibrary } from "@/contexts/LibraryContext";
import ScrollView = Animated.ScrollView;

type BookCardProps = {
  title: string;
  description: string;
  author: string;
  image: any;
  bookData?: any; // all book data from google books api
  onPressFavorite?: () => void;
  isFavorite?: boolean;
};

const BookCard: React.FC<BookCardProps> = ({
  title,
  description,
  author,
  image,
  bookData,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { addBook } = useLibrary();

  const handleAddToLibrary = async () => {
    if (bookData) {
      Alert.alert(
        "Add to Library",
        "Do you want to add this book to your library?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Yes",
            onPress: async () => {
              try {
                await addBook(bookData);
                Alert.alert("Success", "Book added to your library!");
              } catch (err: any) {
                if (err?.message === "This book is already in your library.") {
                  Alert.alert("Error", err.message);
                } else {
                  Alert.alert("Error", "Failed to add book.");
                }
              }
            },
          },
        ]
      );
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.imageWrapper}>
          {/* kendime not: Eğer image local bir foto ise bu number tipindedir, eğer internetten gelen bir foto ise bu object tipindedir. */}
          <Image
            source={image}
            style={
              typeof image === "number"
                ? [styles.image, styles.fallbackImage]
                : styles.image
            }
          />
          <TouchableOpacity
            style={styles.libraryIcon}
            onPress={handleAddToLibrary}
          >
            <Image
              source={require("@/assets/images/addtolibrary.png")}
              style={styles.libraryIconImage}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          by {author}
        </Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setModalVisible(false)}
            >
              <Image
                source={require("@/assets/images/close.png")}
                style={styles.closeIconImage}
              />
            </TouchableOpacity>
            <Image
              source={image}
              style={
                typeof image === "number"
                  ? [styles.image, styles.fallbackImage]
                  : styles.image
              }
            />
            <Text style={styles.modalTitle}>{title}</Text>
            <ScrollView
              style={{ maxHeight: 150 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalDescription}>{description}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    overflow: "hidden",
    borderRadius: 16,
    borderStyle: "solid",
    borderWidth: 0.5,
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 350,
    resizeMode: "contain",
  },
  fallbackImage: {
    width: 180,
    height: 180,
    alignSelf: "center",
    marginVertical: 24,
    borderRadius: 12,
  },
  favoriteIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginHorizontal: 12,
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginHorizontal: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  author: {
    alignSelf: "flex-end",
    fontSize: 14,
    color: "#555",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    paddingTop: 10,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: "#444",
  },
  closeButton: {
    marginTop: 16,
    alignSelf: "flex-end",
  },
  closeButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  libraryIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 999,
    padding: 4,
  },
  libraryIconImage: {
    width: 20,
    height: 20,
  },
  modalCloseIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 4,
  },
  closeIconImage: {
    width: 22,
    height: 22,
    tintColor: "#333",
  },
});

export default BookCard;
