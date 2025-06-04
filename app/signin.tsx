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
  Modal,
  ActivityIndicator,
} from "react-native";
import SignInButtonWithGoogle from "../components/SignInButtonWithGoogle";
import { router } from "expo-router";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { FIREBASE_AUTH, FIREBASE_DB } from "../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const SignInScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      // Firestore'dan firstLaunchCompleted kontrolü
      const user = response.user;
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().firstLaunchCompleted) {
        router.replace("/(tabs)/homefolder/home");
      } else {
        router.replace("/onboarding");
      }
    } catch (error: any) {
      switch (error.code) {
        case "auth/user-not-found":
          Alert.alert("No account found with this email");
          break;
        case "auth/wrong-password":
          Alert.alert("Incorrect password");
          break;
        case "auth/invalid-email":
          Alert.alert("Invalid email format");
          break;
        case "auth/too-many-requests":
          Alert.alert("Too many failed attempts. Please try again later");
          break;
        case "auth/invalid-credential":
          Alert.alert("Invalid email or password");
          break;
        default:
          Alert.alert("An error occurred. Please try again");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(email); // Pre-fill with current email if any
    setResetModalVisible(true);
  };

  const checkEmailAndSendReset = async () => {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsCheckingEmail(true);
    try {
      // Send reset email directly
      await sendPasswordResetEmail(FIREBASE_AUTH, resetEmail);
      Alert.alert(
        "Password Reset Email Sent",
        "Please check your email for instructions to reset your password."
      );
      setResetModalVisible(false);
    } catch (error: any) {
      let errorMessage = "Failed to send reset email. Please try again.";
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setIsCheckingEmail(false);
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
              style={styles.inputText}
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
              autoCapitalize="none"
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
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
          <View style={styles.bottomTextView}>
            <Text style={styles.bottomText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.replace("/signup")}>
              <Text style={styles.linkBold}>Create one</Text>
            </TouchableOpacity>
          </View>
          <SignInButtonWithGoogle />
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address to receive password reset instructions.
            </Text>

            <View style={styles.modalInput}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="gray"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.inputText}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={checkEmailAndSendReset}
                disabled={isCheckingEmail}
              >
                {isCheckingEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  inputText: {
    flex: 1,
    fontSize: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    height: 40,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  resetButton: {
    backgroundColor: "#fdfedb",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  resetButtonText: {
    color: "#000",
    fontWeight: "bold",
  },
});
