import {
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { useLibrary } from "@/contexts/LibraryContext";
import { useRouter } from "expo-router";

export default function EditBookScreen() {
  const { book = "" } = useLocalSearchParams();
  const { addBook } = useLibrary();
  const router = useRouter();

  let parsedBook: any = null;
  try {
    parsedBook = book ? JSON.parse(Array.isArray(book) ? book[0] : book) : null;
  } catch (e) {
    parsedBook = null;
  }

  const [bookTitle, setBookTitle] = useState(
    parsedBook?.volumeInfo?.title || ""
  );
  const [author, setAuthor] = useState(
    parsedBook?.volumeInfo?.authors?.join(", ") || ""
  );
  const [desc, setDesc] = useState(parsedBook?.volumeInfo?.description || "");
  const photoUri =
    parsedBook?.imageUrl ||
    parsedBook?.volumeInfo?.imageLinks?.thumbnail ||
    null;

  useEffect(() => {
    setBookTitle(parsedBook?.volumeInfo?.title || "");
    setAuthor(parsedBook?.volumeInfo?.authors?.join(", ") || "");
    setDesc(parsedBook?.volumeInfo?.description || "");
  }, [parsedBook]);

  const handleUpdate = async () => {
    let bookObj: any = book;
    if (typeof book === "string") {
      try {
        bookObj = JSON.parse(book);
      } catch (e) {
        Alert.alert("Error", "Invalid book data");
        return;
      }
    }
    if (bookObj && typeof bookObj === "object" && !Array.isArray(bookObj)) {
      try {
        await addBook(bookObj);
        router.replace("/(tabs)/reading/index");
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
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/search/index")}
        >
          <Image
            source={require("@/assets/images/arrow-left.png")}
            resizeMode="contain"
            style={{ width: 26, height: 26 }}
          />
        </TouchableOpacity>
        <Text style={styles.header}>Edit Book Details</Text>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.bookImage}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require("@/assets/images/not-avaliable-book-photo.png")}
            style={styles.bookImage}
            resizeMode="contain"
          />
        )}
        <TextInput
          placeholder="Book Title"
          style={styles.input}
          value={bookTitle}
          onChangeText={setBookTitle}
          placeholderTextColor="gray"
          editable={false}
        />
        <TextInput
          placeholder="Author name"
          style={styles.input}
          value={author}
          onChangeText={setAuthor}
          placeholderTextColor="gray"
          editable={false}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={desc}
          onChangeText={setDesc}
          placeholderTextColor="gray"
          multiline
          editable={false}
          numberOfLines={50}
        />
        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Add to Library</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  bookImage: {
    width: 180,
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderColor: "#ccc",
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4f7cff",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 32,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    top: 18,
    left: 18,
    zIndex: 10,
    padding: 4,
  },
});
