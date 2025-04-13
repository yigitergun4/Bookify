import React from 'react';
import {View, TextInput, StyleSheet, Image, TouchableOpacity} from 'react-native';

interface HomePageSearchInputProps {
    isHomePage: boolean;
}

const SearchInput = ({isHomePage}:HomePageSearchInputProps) => {
    return (
        <View style={styles.inputWrapper}>
            <TextInput
                placeholder="Search for books..."
                style={styles.input}
                placeholderTextColor="#18181a"
            />
            <TouchableOpacity onPress={() => {}}>
                <Image
                    source={require('@/assets/images/homepagesearchicon.png')}
                    style={styles.icon}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d6d6db',
        borderRadius: 24,
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        height: 52,
        width: "100%",
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '#18181a',
    },
    icon: {
        width: 17,
        height: 17,
        marginLeft: 8,
    },
});

export default SearchInput;
