import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
} from "react-native";
import LogoHeader from "@/components/LogoHeader";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { RecommendationService } from "@/services/recommendationService";
import { CacheService } from "@/services/cacheService";

const cacheService = CacheService.getInstance();
const recommendationService = RecommendationService.getInstance();

export default function MyProfileScreen() {
  const user = FIREBASE_AUTH.currentUser;
  const [userName, setUserName] = useState("");
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);

  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const userRef = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const fullName = data.name || "";
          const firstName = fullName.split(" ")[0];
          setUserName(firstName);
          setUserGenres(data.favoriteGenres || []);
        }
      }
    };

    const fetchRecommendedBooks = async () => {
      if (!user) return;
      try {
        const cachedBooks = await cacheService.getRecommendedBooks(user.uid);
        if (cachedBooks && cachedBooks.length > 0) {
          setRecommendedBooks(cachedBooks.slice(0, 3));
        } else {
          const newBooks = await recommendationService.getRecommendations(
            user.uid
          );
          setRecommendedBooks(newBooks.slice(0, 3));
          await cacheService.saveRecommendedBooks(user.uid, newBooks);
        }
      } catch (error) {
        console.error("Error loading recommended books:", error);
      }
    };

    fetchUserName();
    fetchRecommendedBooks();
  }, [user]);

  const getImageSource = (book: any) => {
    if (book?.volumeInfo?.imageLinks?.thumbnail) {
      const imageUrl = book.volumeInfo.imageLinks.thumbnail;
      return { uri: imageUrl.replace("http://", "https://") };
    }
    return require("@/assets/images/not-avaliable-book-photo.png");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <LogoHeader title="Bookify" isProfileShown={true} />
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.welcomeView}>
            <Text style={styles.welcomeText}>
              Welcome Back{userName ? `, ${userName}` : ""}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Favorite Genres</Text>
          <View style={styles.genresContainer}>
            {userGenres.map((genre) => (
              <View key={genre} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>AI Recommended Books</Text>
          <View>
            {recommendedBooks.map((book) => (
              <View key={book.id} style={styles.bookRow}>
                <Image source={getImageSource(book)} style={styles.bookImage} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {book.volumeInfo?.title}
                  </Text>
                  <Text style={styles.bookGenre} numberOfLines={1}>
                    {book.volumeInfo?.authors?.join(", ") || "Unknown Author"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  welcomeView: {
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  genreBadge: {
    backgroundColor: "#f4f8b2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 13,
    fontWeight: "500",
  },
  activityBox: {
    backgroundColor: "#eee",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 8,
  },
  bookImage: {
    width: 50,
    height: 70,
    borderRadius: 6,
    resizeMode: "contain",
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  bookGenre: {
    fontSize: 13,
    color: "#666",
  },
});
