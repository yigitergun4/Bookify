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
import { GoogleBooksItem } from "@/types/booksapitypes";
import { collection, getDocs } from "firebase/firestore";

const cacheService = CacheService.getInstance();

export default function TabOneScreen() {
  const [recentClicks, setRecentClicks] = useState<GoogleBooksItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBooksItem | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<number>(Date.now());
  const {
    recommendedBooks,
    addBook,
    clearRecommendedBooks,
    setRecommendedBooks,
  } = useLibrary();
  const navigation = useNavigation();
  const router = useRouter();
  const user = FIREBASE_AUTH.currentUser;

  // Clear recommended books when user changes
  useEffect(() => {
    if (!user) {
      clearRecommendedBooks();
      return;
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Initial fetch
    cacheService.getRecentClicks(user.uid).then((clicks: any) => {
      setRecentClicks(clicks.map((click: any) => click.bookInfo));
    });

    // Subscribe to updates
    const unsubscribe: () => void = cacheService.subscribeToRecentClicks(
      user.uid,
      (clicks: any[]) => {
        setRecentClicks(clicks.map((click: any) => click.bookInfo));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe: () => void = navigation.addListener("focus", () => {
      setInputKey(Date.now());
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const fetchRecommendations: () => Promise<void> = async () => {
      if (user) {
        try {
          setIsLoading(true);
          // Load recommendations from Firebase
          const recommendationsRef = collection(
            FIREBASE_DB,
            "Users",
            user.uid,
            "Recommendations"
          );
          const recommendationsSnap = await getDocs(recommendationsRef);
          if (!recommendationsSnap.empty) {
            const firebaseBooks: GoogleBooksItem[] = recommendationsSnap.docs
              .map((doc: any) => {
                const data = doc.data();
                return data.books;
              })
              .flat();
            if (firebaseBooks.length > 0) {
              // Shuffle the books
              const shuffledBooks: GoogleBooksItem[] = [...firebaseBooks].sort(
                () => Math.random() - 0.5
              );
              setRecommendedBooks(shuffledBooks);
            }
          }
        } catch (error) {
          console.log("Error loading recommended books:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchRecommendations();
  }, [user]);

  const openModal: (book: GoogleBooksItem) => Promise<void> = async (
    book: GoogleBooksItem
  ) => {
    setSelectedBook(book);
    setModalVisible(true);
    // Add to recently viewed
    if (user) {
      try {
        await cacheService.addBookClick(book, user.uid);
        setRecentClicks((prev: GoogleBooksItem[]) => {
          const isAlreadyAdded: boolean = prev.some(
            (b: GoogleBooksItem) =>
              b.id === book.id || b.volumeInfo?.title === book.volumeInfo?.title
          );
          if (isAlreadyAdded) return prev;
          return [book, ...prev].slice(0, 10);
        });
      } catch (error) {
        console.error("Error adding to recently viewed:", error);
      }
    }
  };

  const closeModal: () => void = () => {
    setModalVisible(false);
    setSelectedBook(null);
  };

  let modalImageUrl: string | undefined =
    selectedBook?.volumeInfo?.imageLinks?.thumbnail;
  if (modalImageUrl && modalImageUrl.startsWith("http:")) {
    modalImageUrl = modalImageUrl.replace("http:", "https:");
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
                books={recentClicks.slice(0, 10).map((book) => ({
                  ...book,
                }))}
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
                  books={recommendedBooks.slice(0, 10).map((book) => ({
                    ...book,
                  }))}
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
});
