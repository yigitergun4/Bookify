import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    FlatList,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import {router} from "expo-router";

const books = [
    {
        id: '1',
        title: 'AI: A Modern Approach',
        description:
            'Explore the fundamentals of AI through the lens of the latest technological advancements.',
        image: require('@/assets/images/bookimage.png'),
        author:"Jackie Chan"
    },
    {
        id: '2',
        title: 'Deep Learning Illustrated',
        description:
            'A visually captivating guide to the principles and applications of deep learning.',
        image: require('@/assets/images/bookimage2.png'),
        author:"Jackie Chan"
    },
    {
        id: '3',
        title: 'AI & Machine Learning for Business',
        description:
            'Understand how AI and ML are transforming business landscapes and decision-making processes.',
        image: require('@/assets/images/bookimage3.png'),
        author:"Jackie Chan"
    },
];

const RecommendedScreen = () => {
    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.author}> {item.author} </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container2}>
                <View style={styles.headerView}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Image source={require('@/assets/images/arrow-left.png')} style={styles.arrowLeftImage} />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Recommended for you</Text>
                </View>
                <FlatList
                    data={books}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
};

export default RecommendedScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 25,
    },
    container2:{
        paddingHorizontal: 10,
    },
    headerView:{
        paddingTop:15,
        flexDirection:"row",
        alignItems:"center",
        paddingLeft:15,
        gap:10
    },
    arrowLeftImage:{
        height:30,
        width:30
    },
    headerText: {
        color: '#030303',
        fontSize: 24,
        fontFamily: 'Poppins',
        lineHeight: 32,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#fafafa',
        borderRadius: 16,
        marginTop:15,
        flexDirection: 'row',
        padding: 12,
        // iOS shadow
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 5, height: 5 }, // alt + yanlara dağılır
        shadowRadius: 12,
        // Android shadow
        elevation: 5,
    },
    image: {
        width: 80,
        height: 110,
        borderRadius: 8,
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    title: {
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 4,
    },
    description: {
        color: '#555',
        fontSize: 13,
    },
    author: {
        alignSelf:'flex-end',
        marginTop:40,
        fontSize: 16,
        fontWeight: '600',
    }
});
