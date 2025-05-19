import { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from "react-native";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import LogoHeader from "@/components/LogoHeader";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useLibrary } from "@/contexts/LibraryContext";

const mockBooks = [
  {
    id: "1",
    title: "Hands-On Machine Learning",
    author: "Aurélien Géron",
    description:
      "Practical guide to learning machine learning using Scikit-Learn and TensorFlow.",
    image: require("@/assets/images/bookimage.png"), // Örnek görsel
  },
  {
    id: "2",
    title: "Deep Learning with Python",
    author: "Francois Chollet",
    description:
      "An introduction to deep learning using Python and the powerful Keras library.",
    image: require("@/assets/images/bookimage2.png"),
  },
];

export default function LibraryScreen() {
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const user = FIREBASE_AUTH.currentUser;
  const { libraryBooks } = useLibrary();
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
        }
      }
    };
    fetchUserName();
  }, [user]);

  const filteredBooks = mockBooks.filter((book) =>
    book.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader title={"Bookify"} isProfileShown={false} />
      <Text style={styles.title}>
        {userName ? `${userName}'s Library` : "Your Library"}
      </Text>
      <View style={styles.searchContainer}>
        <HomePageSearchInput isHomePage={false} />
      </View>
      <FlatList
        data={libraryBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const volume = item?.volumeInfo;
          let imageUrl = volume.imageLinks?.thumbnail;
          // HTTP yerine HTTPS kullanmak zorundayım yoksa resimler yüklenmiyor (Güvenlik sorunundan dolayı)
          if (imageUrl && imageUrl.startsWith("http:")) {
            imageUrl = imageUrl.replace("http:", "https:");
          }

          return (
            <View style={styles.card}>
              <Image
                source={
                  imageUrl
                    ? { uri: imageUrl }
                    : require("@/assets/images/bookimage.png")
                }
                style={styles.bookImage}
                resizeMode="cover"
              />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {volume.title}
                </Text>
                <Text style={styles.author} numberOfLines={1}>
                  Author: {volume.authors?.join(", ") || "Unknown"}
                </Text>
                <Text style={styles.description} numberOfLines={1}>
                  Publisher: {volume?.publisher || "No publisher available."}
                </Text>
                <Text style={styles.language} numberOfLines={1}>
                  Language: {volume?.language.toUpperCase()}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No results found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  bookImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginRight: 14,
    backgroundColor: "#eee",
  },
  bookInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  image: {
    width: 70,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  author: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
    color: "#555",
  },
  description: {
    fontSize: 13,
    color: "#333",
  },
  language: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
