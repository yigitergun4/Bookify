import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Themed";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import HomepageCardList from "@/components/HomepageCardList";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { CacheService } from "@/services/cacheService";
import { useLibrary } from "@/contexts/LibraryContext";
import { RecommendationService } from "@/services/recommendationService";
import { getAuth } from "firebase/auth";
import { useRouter } from "expo-router";
import { FIREBASE_AUTH } from "@/FirebaseConfig";

const auth = getAuth();
const cacheService = CacheService.getInstance();

export default function TabOneScreen() {
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now());
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);
  const { addBook } = useLibrary();
  const navigation = useNavigation();
  const router = useRouter();
  const user = FIREBASE_AUTH.currentUser;

  const recommendationService = RecommendationService.getInstance();

  const fetchRecommendedBooks = async () => {
    console.log("fetchRecommendedBooks", recommendedBooks);
    if (!user) return;
    try {
      setIsLoading(true);
      const newBooks = await recommendationService.getRecommendations(user.uid);
      setRecommendedBooks(newBooks);
      await cacheService.saveRecommendedBooks(user.uid, newBooks);
    } catch (error) {
      console.error("Error fetching recommended books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadAndSubscribe = async () => {
      if (!user) return;

      // get recent clicks from cache
      // const clicks = await cacheService.getRecentClicks(user.uid);
      // setRecentClicks(clicks.map((click) => click.bookInfo));

      // Cache değişikliklerini dinle
      const unsubscribe = cacheService.subscribeToRecentClicks((clicks) => {
        if (clicks[0]?.userId === user.uid) {
          setRecentClicks(clicks.map((click) => click.bookInfo));
        }
      });

      // Cleanup
      return () => {
        unsubscribe();
      };
    };

    loadAndSubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setInputKey(Date.now());
    });

    return unsubscribe;
  }, [navigation]);

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

  const handleClearRecommendations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      // Clear recommendations using the service
      await recommendationService.deleteRecommendations(user.uid);

      // Reset state
      setRecommendedBooks([]);
    } catch (error) {
      console.error("[HomeScreen] Error clearing recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grayBackGround}>
          <Text style={styles.grayBackGroundText}>Find your next read</Text>
        </View>
        <View style={styles.container2}>
          <View style={styles.searchInput}>
            <HomePageSearchInput key={inputKey} isHomePage={true} />
          </View>
          {recentClicks.length > 0 && (
            <View style={styles.recentClicksView}>
              <View style={styles.recommendedView2}>
                <Text style={styles.recommendedText}>Recently Viewed</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/homefolder/recentlyview")}
                >
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              <HomepageCardList
                books={recentClicks.slice(0, 10)}
                onBookPress={openModal}
                closeModal={closeModal}
                modalVisible={modalVisible}
                selectedBook={selectedBook}
                addBook={addBook}
              />
            </View>
          )}

          <View style={styles.recommendedView}>
            <View style={styles.recommendedView2}>
              <Text style={styles.recommendedText}>Recommended for you</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/homefolder/recommendbookpage",
                  })
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            {recommendedBooks.length === 0 ? (
              <TouchableOpacity
                style={styles.getRecommendationsButton}
                onPress={fetchRecommendedBooks}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.getRecommendationsText}>
                    Get Book Recommendations
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 10 }}>
                <HomepageCardList
                  books={recommendedBooks.slice(0, 5)}
                  onBookPress={openModal}
                  closeModal={closeModal}
                  modalVisible={modalVisible}
                  selectedBook={selectedBook}
                  addBook={addBook}
                />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={{
              marginTop: 10,
              backgroundColor: "#fdfedb",
              padding: 14,
              borderRadius: 25,
            }}
            onPress={handleClearRecommendations}
          >
            <Text>Clear Recommendations</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container2: {
    paddingHorizontal: 16,
    backgroundColor: "#FFF",
  },
  grayBackGround: {
    backgroundColor: "#d3d3d3",
    justifyContent: "center",
    height: 200,
    width: "100%",
    paddingHorizontal: 25,
  },
  grayBackGroundText: {
    color: "#030303",
    fontSize: 30,
    fontFamily: "Poppins",
    fontWeight: "700",
  },
  searchInput: {
    marginTop: -25,
    borderRadius: 25,
  },
  recommendedView: {
    marginTop: 50,
    backgroundColor: "#FFF",
  },
  recentClicksView: {
    marginTop: 30,
    backgroundColor: "#FFF",
  },
  recommendedView2: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendedText: {
    color: "#030303",
    fontSize: 18,
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  seeAllText: {
    textDecorationLine: "underline",
    color: "black",
  },
  getRecommendationsButton: {
    backgroundColor: "#fdfedb",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  getRecommendationsText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
