import React, { useState } from 'react';
import {
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import {useLocalSearchParams} from "expo-router";

export default function EditBookScreen() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const { photo } = useLocalSearchParams();
    const photoUri = typeof photo === 'string' ? photo : null;

    const handleUpdate = () => {
        // Handle form submission logic here
        console.log({ title, author, description });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.header}>Edit Book Details</Text>
                {photoUri && (
                    <Image
                        source={{ uri: photoUri }}
                        style={styles.bookImage}
                        resizeMode="cover"
                    />
                )}
                <Text style={styles.infoText}>
                    If the book cover is unclear, update the details here.
                </Text>
                <TextInput
                    placeholder="Book Title"
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="gray"
                />
                <TextInput
                    placeholder="Author name"
                    style={styles.input}
                    value={author}
                    onChangeText={setAuthor}
                    placeholderTextColor="gray"
                />
                <TextInput
                    placeholder="Book Description"
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="gray"
                />
                <TouchableOpacity style={styles.button} onPress={handleUpdate}>
                    <Text style={styles.buttonText}>Update Details</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    bookImage: {
        width: 180,
        height: 240,
        borderRadius: 16,
        marginBottom: 20,
    },
    infoText: {
        fontSize: 14,
        color: '#444',
        textAlign: 'center',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: '#f9f9f9',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        borderColor: '#ccc',
        borderWidth: 1,
        fontSize: 14,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#4f7cff',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 32,
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
