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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { FIREBASE_DB } from "@/FirebaseConfig";

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
      // get existing book ids
      const existingBookIds = new Set(recommendedBooks.map((book) => book.id));

      // get new recommendations
      const newBooks = await recommendationService.getRecommendations(
        user.uid,
        skipCount
      );

      // filter out new books that are already in the list
      const uniqueNewBooks = newBooks.filter(
        (book) => !existingBookIds.has(book.id)
      );

      // add new books to the list
      setRecommendedBooks((prevBooks) => [...prevBooks, ...uniqueNewBooks]);
      setSkipCount((prevCount) => prevCount + uniqueNewBooks.length);

      // save new books to firebase
      if (uniqueNewBooks.length > 0) {
        const recommendationsRef = doc(
          FIREBASE_DB,
          "Recommendations",
          user.uid
        );
        const currentRecommendations = await getDoc(recommendationsRef);
        const currentBooks = currentRecommendations.exists()
          ? currentRecommendations.data().books || []
          : [];

        // merge current books with new books and remove duplicates
        const allBooks = [...currentBooks, ...uniqueNewBooks];
        const uniqueBooks = allBooks.filter(
          (book, index, self) =>
            index === self.findIndex((b) => b.id === book.id)
        );

        // save to firebase
        await setDoc(recommendationsRef, {
          books: uniqueBooks,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error loading more recommendations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
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
});
