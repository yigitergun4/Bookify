import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, ViewStyle } from 'react-native';

interface GoogleButtonProps {
    onPress: () => void;
    style?: ViewStyle;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ onPress, style }) => {
    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
            <Image
                source={require('@/assets/images/google.png')}
                style={styles.icon}
                resizeMode="contain"
            />
            <Text style={styles.text}>Sign in with Google</Text>
        </TouchableOpacity>
    );
};

export default GoogleButton;

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#000',
        width: '100%',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    icon: {
        height: 20,
        width: 20,
        marginRight: 8,
    },
    text: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        paddingLeft:10
    },
});
