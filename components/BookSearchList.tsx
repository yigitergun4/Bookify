import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

interface BookSearchListProps {
  books: any[];
  loadingMore: boolean;
  addBook: (book: any) => void;
  handleLoadMore: () => void;
  isAddButtonShown: boolean;
}

const BookSearchList = ({
  books,
  loadingMore,
  addBook,
  handleLoadMore,
  isAddButtonShown,
}: BookSearchListProps) => {
  return (
    <>
      <FlatList
        data={books}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item, index) =>
          item.id ? item.id + "-" + index : index.toString()
        }
        renderItem={({ item }) => {
          const volume = item.volumeInfo;
          let imageUrl = volume.imageLinks?.thumbnail;
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
                    Language: {volume?.language?.toUpperCase()}
                  </Text>
                  {isAddButtonShown && (
                    <TouchableOpacity onPress={() => addBook(item)}>
                      <Image
                        source={require("@/assets/images/addtolibrary.png")}
                        style={{ width: 20, height: 20 }}
                      />
                    </TouchableOpacity>
                  )}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
      {loadingMore && (
        <View style={{ padding: 16, alignItems: "center" }}>
          <ActivityIndicator color="#222" />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
});

export default BookSearchList;
