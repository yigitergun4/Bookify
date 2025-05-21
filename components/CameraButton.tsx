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
import axios from "axios";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const overlayWidth = screenWidth * 0.65;
const overlayHeight = screenHeight * 0.5;
const overlayLeft = (screenWidth - overlayWidth) / 2;
const overlayTop = (screenHeight - overlayHeight) / 2;

export default function CameraButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [croppedUri, setCroppedUri] = useState<string | null>(null); // for debug
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
      // Overlay'nin ekrandaki oranını fotoğraf çözünürlüğüne ölçekle
      const crop = {
        originX: (overlayLeft / screenWidth) * photoWidth,
        originY: (overlayTop / screenHeight) * photoHeight,
        width: (overlayWidth / screenWidth) * photoWidth,
        height: (overlayHeight / screenHeight) * photoHeight,
      };
      // Fotoğrafı kırp
      const cropResult = await manipulateAsync(
        imageUri,
        [
          {
            crop,
          },
        ],
        { compress: 1, format: SaveFormat.JPEG }
      );
      setCroppedUri(cropResult.uri); // debug için göster
      // OCR
      const visionApiKey = "AIzaSyD3wpw7y6jJqL905btvKlscgYku5fZxj_I";
      const base64Image = await getBase64FromUri(cropResult.uri);
      console.log("base64 length", base64Image.length);
      const visionResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }
      );
      console.log(visionResponse.data, "vision response");
      const detectedText = visionResponse.data.responses[0] || "";
      console.log(detectedText, "detectedText");
      const booksApiKey = "AIzaSyALRYFWbp8BkrD7ONPPH5TmJ4_oZEUR1yM";
      const booksResponse = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          detectedText
        )}&key=${booksApiKey}`
      );
      const bookData = booksResponse.data.items?.[0]?.volumeInfo || {
        title: "",
        authors: [],
        description: "",
        imageLinks: { thumbnail: cropResult.uri },
      };
      router.push({
        pathname: "/(tabs)/homefolder/photoeditpage" as any,
        params: {
          title: bookData.title,
          authors: bookData.authors?.join(", ") || "",
          description: bookData.description || "",
          imageUrl: bookData.imageLinks?.thumbnail || cropResult.uri,
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(error.response?.data, "error");
      }
      console.log(error, "error");
    } finally {
      setIsLoading(false);
      setModalVisible(false);
    }
  };

  // Helper to convert local image URI to base64
  async function getBase64FromUri(uri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          const base64data = (reader.result as string).split(",")[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open("GET", uri);
      xhr.responseType = "blob";
      xhr.send();
    });
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        setIsLoading(true);
        // @ts-ignore
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
        <Text>Kamera izni gerekli</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>İzni ver</Text>
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
          {/* Dikey dikdörtgen overlay */}
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
});
