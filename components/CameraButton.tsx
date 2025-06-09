import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { detectText, VisionError } from "../services/visionService";
import {
  searchBook,
  BooksError,
  searchBookList,
} from "../services/booksService";
import { getBase64FromUri } from "../utils/imageUtils";
import {
  extractBookInfoWithGPT,
  GPTError,
  isSimilarTitle,
} from "../services/gptExtractor";
import { getAuth } from "firebase/auth";
import { GoogleBooksItem } from "@/types/booksapitypes";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const overlayWidth = screenWidth * 0.7;
const overlayHeight = screenHeight * 0.5;
const overlayLeft = (screenWidth - overlayWidth) / 2;
const overlayTop = (screenHeight - overlayHeight) / 2;

export default function CameraButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const processImage = async (
    imageUri: string,
    photoWidth: number,
    photoHeight: number
  ) => {
    try {
      setIsLoading(true);
      const crop = {
        originX: (overlayLeft / screenWidth) * photoWidth,
        originY: (overlayTop / screenHeight) * photoHeight,
        width: (overlayWidth / screenWidth) * photoWidth,
        height: (overlayHeight / screenHeight) * photoHeight,
      };

      const cropResult = await manipulateAsync(imageUri, [{ crop }], {
        compress: 1,
        format: SaveFormat.JPEG,
      });

      const base64Image = await getBase64FromUri(cropResult.uri);
      const visionResult = await detectText(
        base64Image,
        auth.currentUser?.uid || ""
      );
      const detectedText = visionResult.textAnnotations?.[0]?.description || "";
      if (!detectedText) {
        throw new VisionError("No text detected in image.");
      }
      const bookInfo = await extractBookInfoWithGPT(detectedText);
      console.log("Extracted book info:", bookInfo);

      let bookData: any = null;

      const trySearch = async (
        title: string,
        author: string,
        language: string
      ) => {
        try {
          const result = await searchBook(title, author, language);
          console.log(
            "✅ Found:",
            result.volumeInfo.title,
            result.volumeInfo.authors
          );
          return result;
        } catch (err) {
          console.log(`❌ Not found: "${title}" - ${author}`);
          return null;
        }
      };

      const mainTitle = bookInfo.title.split(/[:\-]/)[0].trim();
      const fullAuthor = bookInfo.authors?.[0] || "";
      const lastName = fullAuthor.split(" ").pop() || "";
      const language = bookInfo.language || "";

      const searchAttempts = [
        { title: bookInfo.title, author: fullAuthor },
        { title: mainTitle, author: fullAuthor },
        { title: mainTitle, author: lastName },
        { title: bookInfo.title, author: lastName },
        { title: bookInfo.title, author: "" },
        { title: "", author: fullAuthor },
      ].filter(Boolean);

      for (const attempt of searchAttempts) {
        if (attempt && (attempt.title || attempt.author)) {
          bookData = await trySearch(attempt.title, attempt.author, "");

          if (bookData) {
            const isTitleSimilar = await isSimilarTitle(
              bookInfo.title,
              bookData.volumeInfo.title
            );

            console.log("🔍 isTitleSimilar:", isTitleSimilar);

            if (isTitleSimilar) {
              // Benzerse direkt düzenleme sayfasına git
              router.push({
                pathname: "/(tabs)/homefolder/photoeditpage" as any,
                params: {
                  book: JSON.stringify(bookData),
                },
              });
              return; // işlem burada biter
            } else {
              // Farklıysa alternatif kitap listesi al ve yönlendir
              const books = await searchBookList(
                bookInfo.title,
                "",
                language !== "Unknown" ? language : ""
              );
              router.push({
                pathname: "/(tabs)/homefolder/notexactbookfound" as any,
                params: {
                  books: JSON.stringify(books),
                },
              });
              return;
            }
          }
        }
      }

      console.log("🚫 No matching book found.");
    } catch (error) {
      console.error("[CameraButton] Error:", error);
      if (error instanceof VisionError) {
        Alert.alert("Error", error.message);
      } else if (error instanceof GPTError) {
        Alert.alert("Error", error.message);
      } else if (error instanceof BooksError) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
      setModalVisible(false);
    }
  };

  const takePhoto = async () => {
    console.log("takePhoto");
    if (cameraRef.current) {
      try {
        setIsLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
        });
        setModalVisible(false);
        if (photo && photo.uri) {
          await processImage(photo.uri, photo.width, photo.height);
        } else {
          Alert.alert("Error", "No photo captured.");
        }
      } catch (error) {
        setIsLoading(false);
        setModalVisible(false);
        Alert.alert("Error", "Failed to take photo. Please try again.");
      }
    }
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission is required</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Give permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        disabled={isLoading}
        style={styles.button}
      >
        {isLoading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Image
            source={require("@/assets/images/camera-icon.png")}
            style={{ width: 30, height: 30 }}
          />
        )}
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            ratio="16:9"
          />
          <View
            style={[
              styles.overlay,
              {
                left: overlayLeft,
                top: overlayTop,
                width: overlayWidth,
                height: overlayHeight,
              },
            ]}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Image
              source={require("@/assets/images/close.png")}
              style={{ width: 30, height: 30, tintColor: "#fff" }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePhoto}
          ></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "white",
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 10,
  },
  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    borderRadius: "50%",
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
  },
});
