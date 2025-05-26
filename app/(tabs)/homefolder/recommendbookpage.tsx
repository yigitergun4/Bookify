import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import BookSearchList from "@/components/BookSearchList";

const books = [
  {
    id: "1",
    title: "AI: A Modern Approach",
    description:
      "Explore the fundamentals of AI through the lens of the latest technological advancements.",
    image: require("@/assets/images/bookimage.png"),
    author: "Jackie Chan",
  },
  {
    id: "2",
    title: "Deep Learning Illustrated",
    description:
      "A visually captivating guide to the principles and applications of deep learning.",
    image: require("@/assets/images/bookimage2.png"),
    author: "Jackie Chan",
  },
  {
    id: "3",
    title: "AI & Machine Learning for Business",
    description:
      "Understand how AI and ML are transforming business landscapes and decision-making processes.",
    image: require("@/assets/images/bookimage3.png"),
    author: "Jackie Chan",
  },
];

const RecommendedScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Recommended for you</Text>
      </View>
      <BookSearchList
        books={books}
        loadingMore={false}
        addBook={() => {}}
        handleLoadMore={() => {}}
        isAddButtonShown={true}
      />
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
