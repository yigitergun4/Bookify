import React from 'react';
import {View, Text, Image, StyleSheet, ViewStyle, ImageStyle, TextStyle, TouchableOpacity} from 'react-native';
import {router} from "expo-router";

type LogoHeaderProps = {
    title: string;
    containerStyle?: ViewStyle;
    imageStyle?: ImageStyle;
    textStyle?: TextStyle;
    isProfileShown?: boolean;
};

export default function LogoHeader({
                                       title,
                                       containerStyle,
                                       imageStyle,
                                       textStyle,
                                       isProfileShown=false,
                                   }: LogoHeaderProps) {
    return (
        <View style={[styles.logoView, containerStyle]}>
            <View style={styles.logoAndText}>
                <Image source={require("@/assets/images/iconbook.png")} style={[styles.logo, imageStyle]} />
                <Text style={[styles.logoText, textStyle]}>{title}</Text>
            </View>
            {isProfileShown ? <Image source={require("@/assets/images/bookimage.png")} style={styles.profileIcon} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    logoView: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOpacity: 0.09,
        shadowOffset: { width: 0 ,height:5},
        backgroundColor: '#fff',
        paddingHorizontal:20
    },
    logoAndText:{
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        height: 30,
        width: 30,
    },
    logoText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    profileIcon: {
        height:40,
        width:40,
        borderRadius:40,
    }
});
