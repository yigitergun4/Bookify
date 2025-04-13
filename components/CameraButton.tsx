import React, { useState } from 'react';
import { Alert, TouchableOpacity, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function CameraButton() {
    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets.length > 0) {
            const photoUri = result.assets[0].uri;

            router.push({
                pathname: "/(tabs)/homefolder/photoeditpage",
                params: { photo: photoUri },
            });
        }
    };

    return (
        <View>
            <TouchableOpacity onPress={openCamera} style={{ padding: 12 }}>
                <Ionicons name="camera" size={28} color="black" />
            </TouchableOpacity>
        </View>
    );
}
