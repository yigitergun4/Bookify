import { useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
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
  isSimilarAuthor,
  isSimilarTitle,
} from "../services/gptExtractor";
import { getAuth } from "firebase/auth";
import { GoogleBooksItem } from "@/types/booksapitypes";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const overlayWidth = screenWidth * 0.7;
const overlayHeight = screenHeight * 0.5;
const overlayLeft = (screenWidth - overlayWidth) / 2;
const overlayTop = (screenHeight - overlayHeight) / 2;

export default function CameraButton({
  onBookDetected,
}: {
  onBookDetected: (str: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const processImage: (
    imageUri: string,
    photoWidth: number,
    photoHeight: number
  ) => Promise<void> = async (
    imageUri: string,
    photoWidth: number,
    photoHeight: number
  ) => {
    try {
      setIsLoading(true);
      const crop: any = {
        originX: (overlayLeft / screenWidth) * photoWidth,
        originY: (overlayTop / screenHeight) * photoHeight,
        width: (overlayWidth / screenWidth) * photoWidth,
        height: (overlayHeight / screenHeight) * photoHeight,
      };

      const cropResult: any = await manipulateAsync(imageUri, [{ crop }], {
        compress: 1,
        format: SaveFormat.JPEG,
      });

      const base64Image: string = await getBase64FromUri(cropResult.uri);
      const visionResult: any = await detectText(
        base64Image,
        auth.currentUser?.uid || ""
      );
      const detectedText: string =
        visionResult.textAnnotations?.[0]?.description || "";
      if (!detectedText) {
        throw new VisionError("No text detected in image.");
      }
      const bookInfo: any = await extractBookInfoWithGPT(detectedText);
      console.log("Extracted book info:", bookInfo);

      const trySearch = async (
        title: string,
        author: string,
        language: string
      ) => {
        try {
          const result: any = await searchBook(title, author, language);
          console.log(
            "Found:",
            result.volumeInfo.title,
            result.volumeInfo.authors
          );
          return result;
        } catch (err) {
          console.log(`Not found: "${title}" - ${author}`);
          return null;
        }
      };

      const mainTitle: string = bookInfo.title.split(/[:\-]/)[0].trim();
      const fullAuthor: string = bookInfo.authors?.[0] || "";
      const lastName: string = fullAuthor.split(" ").pop() || "";
      const language: string = bookInfo.language || "";

      // Attempt combinations
      const searchAttempts: { title: string; author: string }[] = [
        { title: bookInfo.title, author: fullAuthor },
        { title: mainTitle, author: fullAuthor },
        { title: mainTitle, author: lastName },
        { title: bookInfo.title, author: lastName },
        { title: bookInfo.title, author: "" },
        { title: "", author: fullAuthor },
      ].filter(Boolean);

      let matched: boolean = false;

      for (const attempt of searchAttempts) {
        if (attempt && (attempt.title || attempt.author)) {
          const result = await trySearch(attempt.title, attempt.author, "");

          if (result) {
            const titleSim: boolean = await isSimilarTitle(
              bookInfo.title,
              result.volumeInfo.title
            );
            const authorSim: boolean = await isSimilarAuthor(
              fullAuthor,
              result.volumeInfo.authors?.[0] || ""
            );

            console.log("isTitleSimilar:", titleSim);
            console.log("isAuthorSimilar:", authorSim);

            // Her iki benzerlik de varsa eşleşme başarılıdır
            if (titleSim && authorSim) {
              router.push({
                pathname: "/(tabs)/homefolder/photoeditpage" as any,
                params: {
                  book: JSON.stringify(result),
                },
              });
              onBookDetected(false);
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) {
        console.log("No matching book found. Showing alternatives...");

        const books: GoogleBooksItem[] = await searchBookList(
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
        onBookDetected(false);
      }
    } catch (error) {
      console.log("[CameraButton] Error:", error);
      onBookDetected(false);
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
    console.log("tookPhoto");
    onBookDetected(true);
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
        <Image
          source={require("@/assets/images/camera-icon.png")}
          style={{ width: 30, height: 30 }}
        />
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
