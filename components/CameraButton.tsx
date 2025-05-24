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
import { detectText } from "../services/visionService";
import { searchBook, searchBookList } from "../services/booksService";
import { getBase64FromUri } from "../utils/imageUtils";
import { VisionError } from "../services/visionService";
import { BooksError } from "../services/booksService";
import { extractBookInfoWithGPT } from "../services/gptExtractor";
import { GPTError } from "../services/gptExtractor";

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
      const visionResult = await detectText(base64Image);
      const detectedText = visionResult.textAnnotations?.[0]?.description || "";
      if (!detectedText) {
        throw new VisionError("No text detected in image.");
      }
      const bookInfo = await extractBookInfoWithGPT(detectedText);
      console.log("Extracted book info:", bookInfo);

      let bookData: any = null;

      try {
        console.log(
          "[CameraButton] Orijinal başlık/yazar/dil ile arama:",
          bookInfo.title,
          bookInfo.authors[0],
          bookInfo.language
        );

        // 1. Orijinal başlık ile arama
        try {
          bookData = await searchBook(
            bookInfo.title,
            bookInfo.authors[0] || "",
            bookInfo.language || ""
          );
        } catch (err) {
          console.log("[CameraButton] Orijinal başlıkla kitap bulunamadı.");
        }

        // 2. Eğer kitap bulunamadıysa, İngilizce başlıkla dene
        if (bookInfo.english_title && bookInfo.english_title !== "Unknown") {
          try {
            console.log(
              "[CameraButton] English title ile arama:",
              bookInfo.english_title
            );
            bookData = await searchBook(
              bookInfo.english_title,
              bookInfo.authors[0] || "",
              "en"
            );
          } catch (err) {
            console.log(
              "[CameraButton] English title ile de kitap bulunamadı."
            );
          }
        }

        // 3. Hâlâ kitap bulunamadıysa, alternatif kitap listesini getir
        if (!bookData) {
          try {
            const listOfBooks = await searchBookList(
              bookInfo.title,
              bookInfo.authors[0] || "",
              bookInfo.language || ""
            );
            console.log(
              "[CameraButton] Alternatif kitap listesi bulundu:",
              listOfBooks
            );

            router.replace({
              pathname: "/(tabs)/homefolder/notexactbookfound",
              params: {
                results: JSON.stringify(listOfBooks),
              },
            });

            return;
          } catch (err) {
            console.log(
              "[CameraButton] Alternatif kitap listesi de bulunamadı."
            );
            throw new BooksError("No book found after extended search");
          }
        }

        if (!bookData) {
          throw new BooksError("Invalid book data received");
        }

        router.push({
          pathname: "/(tabs)/homefolder/photoeditpage" as any,
          params: {
            book: JSON.stringify(bookData),
          },
        });
      } catch (error: any) {
        console.error("[CameraButton] Error:", error);
        Alert.alert("Error", error.message || "An unexpected error occurred");
      }

      // if all processes are successful, redirect to photoeditpage
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
          <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
            <Image
              source={require("@/assets/images/camera-icon.png")}
              style={{ width: 30, height: 30 }}
            />
          </TouchableOpacity>
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
    borderColor: "#00FF00",
    backgroundColor: "rgba(0,255,0,0.1)",
    zIndex: 10,
  },
  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#000",
    borderRadius: 30,
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
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
});
