import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import BookSearchList from "@/components/BookSearchList";
import { useState, useEffect } from "react";
import { CacheService } from "@/services/cacheService";
import { getAuth } from "firebase/auth";
import { RecommendationService } from "@/services/recommendationService";

const cacheService = CacheService.getInstance();
const auth = getAuth();
const recommendationService = RecommendationService.getInstance();

const RecommendedScreen = () => {
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const loadRecommendedBooks = async () => {
      if (!user) return;
      try {
        // Önce cache'den kontrol et
        const cachedBooks = await cacheService.getRecommendedBooks(user.uid);

        if (cachedBooks && cachedBooks.length > 0) {
          console.log("Loading recommendations from cache...");
          setRecommendedBooks(cachedBooks);
        }
      } catch (error) {
        console.error("Error loading recommended books:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendedBooks();
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      console.log("Loading more recommendations...");
      const newBooks = await recommendationService.getRecommendations(user.uid);

      // Yeni kitapları mevcut listeye ekle
      setRecommendedBooks((prevBooks) => {
        // Yeni kitapları ekle, ancak aynı ID'ye sahip kitapları ekleme
        const existingIds = new Set(prevBooks.map((book) => book.id));
        const uniqueNewBooks = newBooks.filter(
          (book) => !existingIds.has(book.id)
        );
        return [...prevBooks, ...uniqueNewBooks];
      });
    } catch (error) {
      console.error("Error loading more recommendations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>Recommended for you</Text>
          </View>
          <BookSearchList
            books={recommendedBooks}
            loadingMore={isLoadingMore}
            addBook={() => {}}
            handleLoadMore={handleLoadMore}
            isAddButtonShown={true}
          />
        </>
      )}
    </SafeAreaView>
  );
};

export default RecommendedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
