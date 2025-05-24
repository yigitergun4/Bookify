import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Text } from "@/components/Themed";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import HomePageFlatlistRecommendedBooks from "@/components/HomePageFlatlistRecommendedBooks";
import HomepageCardList from "@/components/HomepageCardList";
import { router, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { CacheService } from "@/services/cacheService";
import { useLibrary } from "@/contexts/LibraryContext";

const cacheService = CacheService.getInstance();

export default function TabOneScreen() {
  const [recentClicks, setRecentClicks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now());
  const { addBook } = useLibrary();
  const navigation = useNavigation();

  useEffect(() => {
    const loadAndSubscribe = async () => {
      // İlk yükleme
      const clicks = await cacheService.getRecentClicks();
      setRecentClicks(clicks.map((click) => click.bookInfo));

      // Cache değişikliklerini dinle
      const unsubscribe = cacheService.subscribeToRecentClicks((clicks) => {
        setRecentClicks(clicks.map((click) => click.bookInfo));
      });

      // Cleanup
      return () => {
        unsubscribe();
      };
    };

    loadAndSubscribe();
  }, []);

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
                <TouchableOpacity>
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
                  router.push("/(tabs)/homefolder/recommendbookpage")
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <View>
              <HomePageFlatlistRecommendedBooks />
            </View>
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
    paddingHorizontal: 25,
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
