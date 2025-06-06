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
import { useRouter } from "expo-router";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const cacheService = CacheService.getInstance();

export default function TabOneScreen() {
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now());
  const { recommendedBooks, addBook, loadRecommendedBooks } = useLibrary();
  const navigation = useNavigation();
  const router = useRouter();
  const user = FIREBASE_AUTH.currentUser;

  useEffect(() => {
    const loadAndSubscribe = async () => {
      if (!user) return;

      try {
        // Check if user has completed onboarding
        const userRef = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        // Only load if onboarding is completed
        if (!userData?.firstLaunchCompleted) return;

        // Load initial cache data
        const clicks = await cacheService.getRecentClicks(user.uid);
        setRecentClicks(clicks.map((click) => click.bookInfo));

        // Subscribe to cache changes
        const unsubscribe = cacheService.subscribeToRecentClicks((clicks) => {
          if (clicks[0]?.userId === user.uid) {
            setRecentClicks(clicks.map((click) => click.bookInfo));
          }
        });

        // Cleanup
        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error("Error loading recent clicks:", error);
      }
    };

    loadAndSubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setInputKey(Date.now());
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (user) {
        try {
          setIsLoading(true); // first loading
          await loadRecommendedBooks();
        } catch (error) {
          console.error("Error loading recommended books:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchRecommendations();
  }, [user]);

  const openModal = async (book: any) => {
    setSelectedBook(book);
    setModalVisible(true);

    // Add to recently viewed
    if (user) {
      try {
        await cacheService.addBookClick(book, user.uid);
      } catch (error) {
        console.error("Error adding to recently viewed:", error);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedBook(null);
  };

  let modalImageUrl = selectedBook?.volumeInfo?.imageLinks?.thumbnail;
  if (modalImageUrl && modalImageUrl?.startsWith("http:")) {
    modalImageUrl = modalImageUrl?.replace("http:", "https:");
  }

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
              isLoading && <ActivityIndicator color="#000" />
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
