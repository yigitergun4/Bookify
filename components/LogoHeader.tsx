import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  TextStyle,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSession } from "@/contexts/AuthContext";

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
  isProfileShown = false,
}: LogoHeaderProps) {
  const { signOut } = useSession();
  const [showPopup, setShowPopup] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      setShowPopup(false);
      router.replace("/signin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <View style={[styles.logoView, containerStyle]}>
      <View style={styles.logoAndText}>
        <Image
          source={require("@/assets/images/iconbook.png")}
          style={[styles.logo, imageStyle]}
        />
        <Text style={[styles.logoText, textStyle]}>{title}</Text>
      </View>
      {isProfileShown ? (
        <View style={styles.profileContainer}>
          <TouchableOpacity onPress={() => setShowPopup(!showPopup)}>
            <Image
              source={require("@/assets/images/bookimage.png")}
              style={styles.profileIcon}
            />
          </TouchableOpacity>
          {showPopup && (
            <Pressable
              style={styles.popupOverlay}
              onPress={() => setShowPopup(false)}
            >
              <View style={styles.popupContent}>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logoView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 5 },
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  logoAndText: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    height: 30,
    width: 30,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
  },
  profileContainer: {
    position: "relative",
  },
  profileIcon: {
    height: 40,
    width: 40,
    borderRadius: 40,
  },
  popupOverlay: {
    position: "absolute",
    top: 45,
    right: 0,
    width: 120,
    zIndex: 1000,
  },
  popupContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
