import React, { useState } from 'react';
import { Alert, TouchableOpacity, Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function CameraButton() {
    const [photo, setPhoto] = useState<string | null>(null);

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
            setPhoto(result.assets[0].uri);
        }


    };

    return (
        <View>
            <TouchableOpacity onPress={openCamera} style={{ padding: 12 }}>
                <Ionicons name="camera" size={28} color="black" />
            </TouchableOpacity>

            {photo && (
                <Image
                    source={{ uri: photo }}
                    style={{ width: 200, height: 200, marginTop: 16, borderRadius: 12 }}
                />
            )}
        </View>
    );
}
