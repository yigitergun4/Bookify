import { FlatList, Text, View, StyleSheet, Image } from "react-native";

const HomePageFlatlistRecommendedBooks = () => {
  const data = [
    {
      id: "1",
      title: "Item One",
      image: require("@/assets/images/bookimage.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 200,
    },
    {
      id: "2",
      title: "Item Two",
      image: require("@/assets/images/bookimage2.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 250,
    },
    {
      id: "3",
      title: "Item One",
      image: require("@/assets/images/bookimage.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 1030,
    },
    {
      id: "4",
      title: "Item Two",
      image: require("@/assets/images/bookimage2.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 210,
    },
    {
      id: "5",
      title: "Item One",
      image: require("@/assets/images/bookimage.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 220,
    },
    {
      id: "6",
      title: "Item Two",
      image: require("@/assets/images/bookimage2.png"),
      author: "Jackie Chan Jhonson",
      pageCount: 400,
    },
  ];
  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image style={styles.bookImage} source={item.image} />
            <View style={styles.bookTexts}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.authorText} numberOfLines={1}>
                - {item.author}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  card: {
    marginRight: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookImage: {
    resizeMode: "contain",
  },
  bookTexts: {
    padding: 8,
  },
  titleText: {
    color: "#030303",
    fontSize: 14,
    fontFamily: "Poppins",
    fontWeight: 500,
    lineHeight: 18,
  },
  authorText: {
    color: "#030303",
    fontSize: 12,
    fontFamily: "Poppins",
    lineHeight: 16,
    alignSelf: "flex-end",
  },
});

export default HomePageFlatlistRecommendedBooks;
