import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
} from 'react-native';
import HomePageSearchInput from "@/components/HomePageSearchInput";
import LogoHeader from "@/components/LogoHeader";

const mockBooks = [
    {
        id: '1',
        title: 'Hands-On Machine Learning',
        author: 'Aurélien Géron',
        description: 'Practical guide to learning machine learning using Scikit-Learn and TensorFlow.',
        image: require('@/assets/images/bookimage.png'), // Örnek görsel
    },
    {
        id: '2',
        title: 'Deep Learning with Python',
        author: 'Francois Chollet',
        description: 'An introduction to deep learning using Python and the powerful Keras library.',
        image: require('@/assets/images/bookimage2.png'),
    },
];

export default function LibraryScreen() {
    const [search, setSearch] = useState('');

    const filteredBooks = mockBooks.filter((book) =>
        book.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            <LogoHeader title={"Bookify"} isProfileShown={false} />
            <Text style={styles.title}>Your Library</Text>
            <View style={styles.searchContainer}>
                <HomePageSearchInput isHomePage={false}/>
            </View>
            <FlatList
                data={filteredBooks}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image source={item.image} style={styles.image} />
                        <View style={styles.cardContent}>
                            <Text style={styles.bookTitle}>{item.title}</Text>
                            <Text style={styles.author}>by {item.author}</Text>
                            <Text style={styles.description}>{item.description}</Text>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginVertical: 25,
    },
    searchContainer: {
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        borderRadius: 16,
        padding: 12,
        marginTop: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
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
        fontWeight: '700',
        marginBottom: 4,
    },
    author: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
        color: '#555',
    },
    description: {
        fontSize: 13,
        color: '#333',
    },
    listView:{
    }
});

