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
import { searchBook, BooksError } from "../services/booksService";
import { getBase64FromUri } from "../utils/imageUtils";
import { extractBookInfoWithGPT, GPTError } from "../services/gptExtractor";
import { getAuth } from "firebase/auth";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const overlayWidth = screenWidth * 0.65;
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

      // 1. First try: Original title and author
      try {
        console.log(
          "[CameraButton] Original title/author/language search:",
          bookInfo.title,
          bookInfo.authors[0],
          bookInfo.language
        );
        bookData = await searchBook(
          bookInfo.title,
          bookInfo.authors[0] || "",
          bookInfo.language || ""
        );
      } catch (err) {
        console.log("[CameraButton] Original title not found.");
      }

      // 2. Title splitting and alternative searches
      if (!bookData) {
        console.log("[CameraButton] Alternative searches...");

        // Split title into parts
        const titleParts = bookInfo.title.split(/[:\-]/);
        const mainTitle = titleParts[0].trim();
        const subtitle = titleParts[1]?.trim();

        // Split author name into parts
        const authorParts = (bookInfo.authors[0] || "").split(" ");
        const lastName = authorParts[authorParts.length - 1] || "";

        // 2.1 Main title + full author
        if (!bookData) {
          try {
            bookData = await searchBook(
              mainTitle,
              bookInfo.authors[0] || "",
              bookInfo.language || ""
            );
            if (bookData)
              console.log("[CameraButton] Main title + full author found");
          } catch (err) {
            console.log("[CameraButton] Main title + full author not found");
          }
        }

        // 2.2 Main title + last name
        if (!bookData) {
          try {
            bookData = await searchBook(
              mainTitle,
              lastName,
              bookInfo.language || ""
            );
            if (bookData)
              console.log("[CameraButton] Main title + last name found");
          } catch (err) {
            console.log("[CameraButton] Main title + last name not found");
          }
        }

        // 2.3 Full title + last name
        if (!bookData) {
          try {
            bookData = await searchBook(
              bookInfo.title,
              lastName,
              bookInfo.language || ""
            );
            if (bookData)
              console.log("[CameraButton] Full title + last name found");
          } catch (err) {
            console.log("[CameraButton] Full title + last name not found");
          }
        }

        // 2.4 Subtitle + full author (if exists)
        if (!bookData && subtitle) {
          try {
            bookData = await searchBook(
              subtitle,
              bookInfo.authors[0] || "",
              bookInfo.language || ""
            );
            if (bookData)
              console.log("[CameraButton] Subtitle + full author found");
          } catch (err) {
            console.log("[CameraButton] Subtitle + full author not found");
          }
        }

        // 2.5 Subtitle + last name (if exists)
        if (!bookData && subtitle) {
          try {
            bookData = await searchBook(
              subtitle,
              lastName,
              bookInfo.language || ""
            );
            if (bookData)
              console.log("[CameraButton] Subtitle + last name found");
          } catch (err) {
            console.log("[CameraButton] Subtitle + last name not found");
          }
        }
      }

      if (!bookData) {
        console.log("[CameraButton] Hiçbir kombinasyonla kitap bulunamadı.");
        throw new BooksError("No book found after extended search");
      }

      // If book is found, redirect
      router.push({
        pathname: "/(tabs)/homefolder/photoeditpage" as any,
        params: {
          book: JSON.stringify(bookData),
        },
      });
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
