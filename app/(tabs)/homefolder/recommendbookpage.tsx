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
  const [skipCount, setSkipCount] = useState(0);
  const user = auth.currentUser;

  useEffect(() => {
    const loadRecommendedBooks = async () => {
      if (!user) return;
      try {
        // firstly check the cache
        const cachedBooks = await cacheService.getRecommendedBooks(user.uid);

        if (cachedBooks && cachedBooks.length > 0) {
          setRecommendedBooks(cachedBooks);
          setSkipCount(cachedBooks.length);
          setIsLoading(false);
        } else {
          // if cache is empty, fetch new recommendations
          const newBooks = await recommendationService.getRecommendations(
            user.uid
          );
          setRecommendedBooks(newBooks);
          setSkipCount(newBooks.length);
          await cacheService.saveRecommendedBooks(user.uid, newBooks);
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
    if (isLoadingMore || !user) return;
    setIsLoadingMore(true);
    try {
      // Mevcut kitapların ID'lerini al
      const existingBookIds = new Set(recommendedBooks.map((book) => book.id));

      // Yeni önerileri al
      const newBooks = await recommendationService.getRecommendations(
        user.uid,
        skipCount
      );

      // Sadece yeni ve benzersiz kitapları filtrele
      const uniqueNewBooks = newBooks.filter(
        (book) => !existingBookIds.has(book.id)
      );

      // Yeni kitapları mevcut listeye ekle
      setRecommendedBooks((prevBooks) => [...prevBooks, ...uniqueNewBooks]);
      setSkipCount((prevCount) => prevCount + uniqueNewBooks.length);
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
