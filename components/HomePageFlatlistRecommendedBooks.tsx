import {FlatList, Text, View, StyleSheet, Image} from "react-native";

const HomePageFlatlistRecommendedBooks = () => {
    const data = [
        { id: '1', title: 'Item One',image: require('@/assets/images/bookimage.png'),author:"ASdds",pageCount:200 },
        { id: '2', title: 'Item Two',image: require('@/assets/images/bookimage2.png'),author:"ASdds",pageCount:250 },
        { id: '3', title: 'Item One',image: require('@/assets/images/bookimage.png'),author:"ASdds",pageCount:1030 },
        { id: '4', title: 'Item Two',image: require('@/assets/images/bookimage2.png'),author:"ASdds",pageCount:210 },
        { id: '5', title: 'Item One',image: require('@/assets/images/bookimage.png'),author:"ASdds",pageCount:220 },
        { id: '6', title: 'Item Two',image: require('@/assets/images/bookimage2.png'),author:"ASdds",pageCount:400 },
    ];
    return (
        <FlatList
            data={data}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <Image style={styles.bookImage} source={item.image}/>
                    <Text>
                        {item.title}
                    </Text>
                    <Text>
                        {item.author}
                    </Text>
                </View>
            )}
        />
    )
}

const styles = StyleSheet.create({
    card: {
        width: 240,
        height:190,
        marginTop:20,
        backgroundColor: '#d3d3d3',
        padding: 5,
        borderRadius: 12,
        marginRight: 12,
        overflow: 'hidden',
    },
    bookImage: {
        width: '100%',
        objectFit: "cover",
        borderRadius:12 ,
    },
    bookTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    bookAuthor: {
        fontSize: 12,
        color: '#666',
    },
});

export default HomePageFlatlistRecommendedBooks;