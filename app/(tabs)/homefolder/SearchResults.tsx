import { useLocalSearchParams } from "expo-router";
import { useLibrary } from "@/contexts/LibraryContext";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from "react-native";

export default function SearchResultsScreen() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addBook } = useLibrary();
  useEffect(() => {
    const fetchBooks = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
            query
          )}`
        );
        const data = await response.json();
        const items = data.items || [];
        setBooks(items);
      } catch (err) {
        console.error("Google Books API error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [query]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Search Results</Text>
        <Text style={styles.subtitle}>Results for “{query}”</Text>
      </View>
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 20, color: "#888" }}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const volume = item.volumeInfo;
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
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.language} numberOfLines={1}>
                      Language: {volume?.language.toUpperCase()}
                    </Text>
                    <TouchableOpacity onPress={() => addBook(item)}>
                      <Image
                        source={require("@/assets/images/addtolibrary.png")}
                        style={{ width: 20, height: 20 }}
                      />
                    </TouchableOpacity>
                  </View>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  screenTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
  bookTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  author: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#666",
  },
  description: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
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
  addButton: {
    marginTop: 8,
    backgroundColor: "#222",
    color: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
  },
});
