import { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  Linking,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { detectText, VisionError } from "../services/visionService";
import {
  BooksError,
  searchBookList,
  searchBooksSequential,
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
const overlayWidth: number = screenWidth * 0.7;
const overlayHeight: number = screenHeight * 0.5;
const overlayLeft: number = (screenWidth - overlayWidth) / 2;
const overlayTop: number = (screenHeight - overlayHeight) / 2;

export default function CameraButton({
  onBookDetected,
}: {
  onBookDetected: (str: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef: any = useRef<CameraView>(null);
  const router: any = useRouter();
  const auth: any = getAuth();

  const handleCameraPress = async () => {
    try {
      // Android için native kamera kullan
      if (Platform.OS === "android") {
        await openNativeCamera();
        return;
      }

      // iOS için expo camera kullan
      if (!permission?.granted) {
        const { granted } = await requestPermission();

        if (!granted) {
          Alert.alert(
            "Camera Permission Required",
            "We need camera permission to take photos of books.",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Go to Settings",
                onPress: () => Linking.openSettings(),
                style: "default",
              },
            ]
          );
          return;
        }
      }
      // If permission is granted, open modal
      setModalVisible(true);
    } catch (error) {
      console.error("Camera permission error:", error);
      Alert.alert(
        "Error",
        "An error occurred while checking camera permission. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  const openNativeCamera = async () => {
    try {
      // Android için kamera izni iste
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "We need camera permission to take photos of books.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Go to Settings",
              onPress: () => Linking.openSettings(),
              style: "default",
            },
          ]
        );
        return;
      }
      onBookDetected(true);
      setIsLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [16, 9],
        quality: 0.8, // Reduced quality for faster processing
        exif: false, // Disable exif data for smaller file
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];
        console.log("Native camera photo:", photo);
        await processImage(photo.uri, photo.width || 0, photo.height || 0);
      } else {
        setIsLoading(false);
        onBookDetected(false);
      }
    } catch (error) {
      setIsLoading(false);
      onBookDetected(false);
      Alert.alert("Error", "Failed to take photo. Please try again.");
      console.log("Native camera error:", error);
    }
  };

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

      let finalImageUri = imageUri;

      // Platform-specific image processing
      if (Platform.OS === "ios") {
        // iOS: Crop image as before
        const crop: any = {
          originX: (overlayLeft / screenWidth) * photoWidth,
          originY: (overlayTop / screenHeight) * photoHeight,
          width: (overlayWidth / screenWidth) * photoWidth,
          height: (overlayHeight / screenHeight) * photoHeight,
        };

        const cropResult: any = await manipulateAsync(imageUri, [{ crop }], {
          compress: 0.8,
          format: SaveFormat.JPEG,
        });
        finalImageUri = cropResult.uri;
      } else {
        // Android: Resize and compress image for faster processing
        const resizeResult: any = await manipulateAsync(
          imageUri,
          [
            {
              resize: {
                width: Math.min(photoWidth, 800), // Smaller max width for faster processing
                height: Math.min(photoHeight, 1000), // Smaller max height for faster processing
              },
            },
          ],
          {
            compress: 0.6, // Higher compression for Android (faster processing)
            format: SaveFormat.JPEG,
          }
        );
        finalImageUri = resizeResult.uri;
        console.log("Android image resized for faster processing");
      }

      const base64Image: string = await getBase64FromUri(finalImageUri);
      const visionResult: any = await detectText(
        base64Image,
        auth.currentUser?.uid || ""
      );
      const detectedText: string =
        visionResult.textAnnotations?.[0]?.description || "";
      if (!detectedText) {
        throw new VisionError("No text detected in image.");
      }
      console.log("sending to gpt", detectedText);
      const bookInfo: any = await extractBookInfoWithGPT(detectedText);
      console.log("Extracted book info:", bookInfo);

      const trySearchSequential: (
        title: string,
        author: string,
        language: string
      ) => Promise<any> = async (title: string, author: string) => {
        try {
          // Use the new booksService function to get multiple books
          const items: GoogleBooksItem[] = await searchBooksSequential(
            title,
            author
          );

          console.log(`Found ${items.length} books, checking sequentially...`);

          // Check books sequentially (0, 1, 2, etc.)
          for (let i = 0; i < Math.min(items.length, 5); i++) {
            const book = items[i];
            console.log(
              `Checking book #${i + 1}: ${book.volumeInfo.title} by ${book.volumeInfo.authors?.[0] || "Unknown"}`
            );

            try {
              const titleSim: boolean = await isSimilarTitle(
                bookInfo.title,
                book.volumeInfo.title
              );
              const authorSim: boolean = await isSimilarAuthor(
                fullAuthor,
                book.volumeInfo.authors?.[0] || ""
              );

              console.log(`Book #${i + 1} - isTitleSimilar:`, titleSim);
              console.log(`Book #${i + 1} - isAuthorSimilar:`, authorSim);

              // If both are similar, return this book
              if (titleSim && authorSim) {
                console.log(`✅ Match found at position #${i + 1}!`);
                return book;
              }
            } catch (error) {
              console.log(`Error checking book #${i + 1}:`, error);
              continue;
            }
          }

          console.log("No exact match found in sequential check");
          return null;
        } catch (err) {
          console.log(`Search error for: "${title}" - ${author}`, err);
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
          const result: any = await trySearchSequential(
            attempt.title,
            attempt.author,
            ""
          );
          console.log(result, "result");

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

            // if both are similar, then we have a match
            if (titleSim && authorSim) {
              setIsLoading(false);
              setModalVisible(false);
              router.push({
                pathname: "/(tabs)/homefolder/photoeditpage",
                params: {
                  book: JSON.stringify(result),
                },
              });
              onBookDetected(false);
              return; // Early return to prevent further execution
            }
          }
        }
      }

      console.log("No matching book found. Showing alternatives...");

      // Both platforms use searchBookList now with Android timeout optimization
      let books: GoogleBooksItem[] = [];

      if (Platform.OS === "android") {
        try {
          // Android: Add timeout for faster response
          books = await searchBookList(
            bookInfo.title,
            bookInfo.authors !== "Unknown" ? bookInfo.authors : "Unknown",
            language !== "Unknown" ? language : "Unknown"
          );
          console.log("Android: Search completed successfully");
        } catch (error) {
          console.log(
            "Android: Search timeout or failed, showing empty results"
          );
          books = [];
        }
      } else {
        // iOS: Normal search without timeout
        books = await searchBookList(
          bookInfo.title,
          bookInfo.authors !== "Unknown" ? bookInfo.authors : "Unknown",
          language !== "Unknown" ? language : "Unknown"
        );
      }

      router.push({
        pathname: "/(tabs)/homefolder/notexactbookfound",
        params: {
          books: JSON.stringify(books),
        },
      });
      onBookDetected(false);
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

  const takePhoto: () => Promise<void> = async () => {
    console.log("tookPhoto");
    onBookDetected(true);
    if (cameraRef.current) {
      try {
        setIsLoading(true);
        const photo: any = await cameraRef.current.takePictureAsync({
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
        console.log("Error:", error);
        onBookDetected(false);
      }
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handleCameraPress}
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
