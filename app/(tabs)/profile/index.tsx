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

const recommendedBooks = [
  {
    id: "1",
    title: "Future Minds",
    genre: "Science Fiction",
    image: require("@/assets/images/bookimage.png"),
  },
  {
    id: "2",
    title: "The Quantum Leap",
    genre: "Non-Fiction",
    image: require("@/assets/images/bookimage2.png"),
  },
  {
    id: "3",
    title: "The Quantum Leap",
    genre: "Non-Fiction",
    image: require("@/assets/images/bookimage2.png"),
  },
];

export default function MyProfileScreen() {
  const user = FIREBASE_AUTH.currentUser;
  const [userName, setUserName] = useState("");
  const [userGenres, setUserGenres] = useState<string[]>([]);

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
    fetchUserName();
  }, [user]);

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
          {/* Buraya yeni feature eklenecek */}
          <Text style={styles.sectionTitle}>AI Recommended Books</Text>
          <View>
            {recommendedBooks.map((book) => (
              <View key={book.id} style={styles.bookRow}>
                <Image source={book.image} style={styles.bookImage} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookGenre}>{book.genre}</Text>
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
  activityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  progressText: {
    fontSize: 12,
    color: "#444",
    marginTop: 8,
  },
  bookRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  bookImage: {
    width: 50,
    height: 70,
    borderRadius: 6,
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  bookGenre: {
    fontSize: 13,
    color: "#666",
  },
});
