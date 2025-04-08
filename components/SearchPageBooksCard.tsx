import React, { useState } from 'react';
import {View, Text, StyleSheet, Image, TouchableOpacity, Modal, Animated} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScrollView = Animated.ScrollView;

type BookCardProps = {
    title: string;
    description: string;
    author: string;
    image: any;
    onPressFavorite?: () => void;
    isFavorite?: boolean;
};

const BookCard: React.FC<BookCardProps> = ({ title,description,author,image,onPressFavorite,isFavorite = false,}) => {
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <>
            <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)}>
                <View style={styles.imageWrapper}>
                    <Image source={image} style={styles.image} />
                    <TouchableOpacity style={styles.favoriteIcon} onPress={onPressFavorite}>
                        <Ionicons
                            name={isFavorite ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFavorite ? 'red' : 'black'}
                        />
                    </TouchableOpacity>
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {description}
                </Text>
                <Text style={styles.author} numberOfLines={1}>
                    - {author}
                </Text>
            </TouchableOpacity>
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Image source={image} style={[styles.image,{borderRadius:10}]} />
                        <Text style={styles.modalTitle}>{title}</Text>
                        <ScrollView style={{maxHeight: 150}} showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalDescription}>{description}{description}{description}{description}{description}{description}{description}{description}</Text>
                        </ScrollView>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        overflow: 'hidden',
        borderRadius: 16,
        borderStyle: 'solid',
        borderWidth: 0.5,
    },
    imageWrapper: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 350,
        resizeMode: 'cover',
    },
    favoriteIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 999,
        padding: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 12,
        marginHorizontal: 12,
    },
    description: {
        fontSize: 14,
        color: '#555',
        marginHorizontal: 12,
        marginBottom: 12,
        marginTop: 4,
    },
    author:{
        alignSelf: 'flex-end',
        fontSize: 14,
        color: '#555',
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
    },
    modalTitle: {
        paddingTop:10,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalDescription: {
        fontSize: 15,
        color: '#444',
    },
    closeButton: {
        marginTop: 16,
        alignSelf: 'flex-end',
    },
    closeButtonText: {
        color: '#007AFF',
        fontWeight: '600',
    },
});

export default BookCard;
