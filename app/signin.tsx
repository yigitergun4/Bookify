import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
} from "react-native";
import SignInButtonWithGoogle from "../components/SignInButtonWithGoogle";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FIREBASE_AUTH } from "../FirebaseConfig";

const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      router.replace("/(tabs)/homefolder/home");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/images/iconbook.png")}
              style={styles.iconBook}
            ></Image>
            <Text style={styles.logo}> Bookify</Text>
          </View>
          <View style={styles.input}>
            <TextInput
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
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="gray"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <Image
                  source={require("@/assets/images/visibility_off_password.png")}
                  style={styles.iconVisibility}
                />
              ) : (
                <Image
                  source={require("@/assets/images/visibility_on_password.png")}
                  style={styles.iconVisibility}
                />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.signInButton} onPress={signIn}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
          <View style={styles.bottomTextView}>
            <Text style={styles.bottomText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/signup")}>
              <Text style={styles.linkBold}>Create one</Text>
            </TouchableOpacity>
          </View>
          <SignInButtonWithGoogle onPress={() => {}} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingBottom: 50,
  },
  iconBook: {
    height: 40,
    width: 40,
  },
  iconVisibility: {
    height: 20,
    width: 20,
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
  },
  card: {
    marginTop: 150,
    backgroundColor: "#fff",
    margin: 24,
    padding: 24,
    paddingTop: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cce0ff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    alignSelf: "center",
    marginBottom: 20,
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
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
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
    marginTop: 15,
    backgroundColor: "#fdfedb",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 16,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  linkText: {
    textAlign: "center",
    color: "#444",
    marginBottom: 10,
  },
  bottomTextView: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
  },
  bottomText: {
    textAlign: "center",
    color: "#222",
    marginBottom: 16,
  },
  linkBold: {
    fontWeight: "bold",
    color: "#000",
  },
  googleButton: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 50,
    alignItems: "center",
  },
  googleText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
