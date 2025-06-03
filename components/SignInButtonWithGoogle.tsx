import React from "react";
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import ENV from "@/config/env";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { FIREBASE_AUTH } from "../FirebaseConfig";
import { router } from "expo-router";

interface GoogleButtonProps {
  style?: ViewStyle;
}

WebBrowser.maybeCompleteAuthSession();
GoogleSignin.configure({
  webClientId: ENV.WEB_CLIENT_ID,
});

const GoogleButton: React.FC<GoogleButtonProps> = ({ style }) => {
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log("userInfo", userInfo);
      const { idToken } = await GoogleSignin.getTokens();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(FIREBASE_AUTH, googleCredential);
      router.replace("/(tabs)/homefolder/home");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={signInWithGoogle}>
      <Image
        source={require("@/assets/images/google.png")}
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
    backgroundColor: "#000",
    width: "100%",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  icon: {
    height: 20,
    width: 20,
    marginRight: 8,
  },
  text: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    paddingLeft: 10,
  },
});
