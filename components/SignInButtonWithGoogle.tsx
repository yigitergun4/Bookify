import React from "react";
import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { FIREBASE_AUTH, FIREBASE_DB } from "../FirebaseConfig";
import { router } from "expo-router";
import { getDoc, doc, setDoc } from "firebase/firestore";

interface GoogleButtonProps {
  style?: ViewStyle;
}

// WebBrowser.maybeCompleteAuthSession();
// GoogleSignin.configure({
//   webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
// });

const GoogleButton: React.FC<GoogleButtonProps> = ({ style }) => {
  // const signInWithGoogle = async () => {
  //   try {
  //     await GoogleSignin.hasPlayServices();

  //     const userInfo = await GoogleSignin.signIn();

  //     if (!userInfo || !userInfo?.data?.idToken) {
  //       return;
  //     }

  //     const googleCredential = GoogleAuthProvider.credential(
  //       userInfo?.data?.idToken
  //     );
  //     const userCredential = await signInWithCredential(
  //       FIREBASE_AUTH,
  //       googleCredential
  //     );

  //     const user = userCredential.user;
  //     if (user) {
  //       const userRef = doc(FIREBASE_DB, "Users", user.uid);
  //       const userSnap = await getDoc(userRef);

  //       if (userSnap.exists() && userSnap.data().firstLaunchCompleted) {
  //         router.replace("/(tabs)/homefolder/home");
  //       } else {
  //         if (!userSnap.exists()) {
  //           await setDoc(userRef, {
  //             email: user.email,
  //             displayName: user.displayName,
  //             photoURL: user.photoURL,
  //             firstLaunchCompleted: false,
  //             favoriteGenres: [],
  //             favoriteBooks: [],
  //             libraryBooks: [],
  //             createdAt: new Date().toISOString(),
  //           });
  //         }
  //         router.replace("/onboarding");
  //       }
  //     }
  //   } catch (error: any) {
  //     if (
  //       error.code === statusCodes.SIGN_IN_CANCELLED ||
  //       error.message?.includes("cancel")
  //     ) {
  //       console.log("User cancelled the sign-in process");
  //       return;
  //     }
  //     console.error("Google Sign-In Error:", error);
  //   }
  // };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={() => {}}>
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
