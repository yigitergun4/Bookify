import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Image,
} from 'react-native';
import SignInButtonWithGoogle from "@/components/SignInButtonWithGoogle";

const SignInScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignIn = () => {
        alert(`Sign in pressed with email: ${email}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View>
                <View style={styles.logoContainer}>
                    <Image source={require("@/assets/images/iconbook.png")} style={styles.iconBook}></Image>
                    <Text style={styles.logo}> AI Library</Text>
                </View>
                <View style={styles.card}>
                    <Text style={styles.title}>Sign In</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <Image source={require("@/assets/images/visibility_off_password.png")} style={styles.iconBook}/> : <Image source={require("@/assets/images/visibility_on_password.png")} style={styles.iconBook}/> }
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                        <Text style={styles.signInButtonText}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text style={styles.linkText}>Forgot Password?</Text>
                    </TouchableOpacity>
                    <Text style={styles.bottomText}>
                        Don't have an account?{' '}
                        <Text style={styles.linkBold}>Create one</Text>
                    </Text>
                    <SignInButtonWithGoogle onPress={handleSignIn}/>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default SignInScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    logoContainer: {
        marginTop: 135,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    iconBook:{
        height:20,
        width:20,
    },
    logo: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#fff',
        margin: 24,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#cce0ff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        alignSelf: 'center',
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        padding: 12,
        paddingLeft: 16,
        marginBottom: 12,
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 16,
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
    },
    eyeIcon: {
        fontSize: 18,
    },
    signInButton: {
        backgroundColor: '#fdfedb',
        padding: 14,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 16,
    },
    signInButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkText: {
        textAlign: 'center',
        color: '#444',
        marginBottom: 10,
    },
    bottomText: {
        textAlign: 'center',
        color: '#222',
        marginBottom: 16,
    },
    linkBold: {
        fontWeight: 'bold',
        color: '#000',
    },
    googleButton: {
        backgroundColor: '#000',
        padding: 14,
        borderRadius: 50,
        alignItems: 'center',
    },
    googleText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});
