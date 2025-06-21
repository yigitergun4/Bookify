import { View, Text, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import LogoHeader from "@/components/LogoHeader";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import HomepageCardList from "@/components/HomepageCardList";
import { GoogleBooksItem } from "@/types/booksapitypes";

export default function MyProfileScreen() {
  const user: any = FIREBASE_AUTH.currentUser;
  const [userName, setUserName] = useState<string>("");
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<GoogleBooksItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<GoogleBooksItem | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserName: () => Promise<void> = async () => {
      if (user) {
        const userRef: any = doc(FIREBASE_DB, "Users", user.uid);
        const userSnap: any = await getDoc(userRef);
        if (userSnap.exists()) {
          const data: any = userSnap.data();
          const fullName: string = data.name || "";
          const firstName: string = fullName.split(" ")[0];
          const books: GoogleBooksItem[] = data.favoriteBooks || [];
          setFavoriteBooks(books);
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
            {userGenres.map((genre: string) => (
              <View key={genre} style={styles.genreBadge}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Your Favorite Books</Text>
          <View>
            <HomepageCardList
              books={favoriteBooks}
              onBookPress={(book: GoogleBooksItem) => {
                setSelectedBook(book);
                setModalVisible(true);
              }}
              closeModal={() => {
                setModalVisible(false);
              }}
              modalVisible={modalVisible}
              selectedBook={selectedBook}
            />
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
});
