import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import SignInButtonWithGoogleButton from "../components/SignInButtonWithGoogle";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../FirebaseConfig";

const SignUpScreen = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const signUp: () => Promise<void> = async () => {
    try {
      const response = await createUserWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      Alert.alert("Success", "You have successfully created an account", [
        {
          text: "OK",
          onPress: () => router.replace("/signin"),
        },
      ]);
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("You already have an account");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Invalid email");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Password is too weak");
      } else {
        Alert.alert("An error occurred");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleHeader}>
          <Image
            source={require("@/assets/images/headerbookicon.png")}
            style={{ height: 30, width: 30 }}
          />
          <Text style={styles.logo}>Bookify</Text>
        </View>
        <Image
          style={styles.image}
          source={require("@/assets/images/signupimage.png")}
        />
        <Text style={styles.welcome}>Welcome to Bookify!</Text>
        <Text style={styles.subtext}>
          Discover a world of AI knowledge and resources.{"\n"}Sign up to
          explore more.
        </Text>
      </View>
      <View style={styles.form}>
        <View style={styles.input}>
          <TextInput
            style={styles.textInput}
            placeholder="Email"
            placeholderTextColor="gray"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.input}>
          <TextInput
            key={showPassword ? "text" : "password"}
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor="gray"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <Image
                source={require("@/assets/images/visibility_off_password.png")}
                style={{ height: 20, width: 20 }}
              />
            ) : (
              <Image
                source={require("@/assets/images/visibility_on_password.png")}
                style={{ height: 20, width: 20 }}
              />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.signInTextView}>
          <Text style={styles.signInText}>Already have an account?</Text>
          <TouchableOpacity
            style={{}}
            onPress={() => router.replace("/signin")}
          >
            <Text style={{ fontWeight: "bold" }}>Sign in</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.signUpButton} onPress={signUp}>
          <Text style={styles.signUpButtonText}>Sign up</Text>
        </TouchableOpacity>
        <View style={styles.orLine}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>
        <SignInButtonWithGoogleButton />
      </View>
    </SafeAreaView>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    marginTop: 12,
  },
  titleHeader: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginBottom: 20,
  },
  logo: {
    fontSize: 30,
    fontWeight: "bold",
  },
  image: {
    width: "90%",
    height: 200,
    borderRadius: 16,
  },
  welcome: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    color: "#555",
    marginTop: 6,
    marginBottom: 10,
  },
  form: {
    backgroundColor: "#fdfedb",
    margin: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
  },
  input: {
    height: 40,
    fontSize: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    fontFamily: "Montserrat-Regular",
    backgroundColor: "white",
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
    fontFamily: "Montserrat-Regular",
    textAlignVertical: "center",
    includeFontPadding: false,
    padding: 0,
  },
  toggleText: {
    color: "#007bff",
    textAlign: "right",
    marginBottom: 8,
    fontSize: 14,
  },
  signInTextView: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  signInText: {
    fontSize: 14,
    paddingTop: 12,
    color: "#333",
    marginBottom: 12,
    alignSelf: "center",
  },
  signUpButton: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  orLine: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  orText: {
    marginHorizontal: 8,
    color: "#888",
  },
});
