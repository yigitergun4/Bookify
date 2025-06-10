import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { router } from "expo-router";

interface LogoHeaderProps {
  title: string;
  isProfileShown?: boolean;
}

export default function LogoHeader({
  isProfileShown = false,
}: LogoHeaderProps) {
  const [showPopup, setShowPopup] = React.useState(false);

  const handleLogout = async () => {
    try {
      router.replace("/signin");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setShowPopup(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/iconbook.png")}
          style={styles.iconBook}
        />
        <Text style={styles.logo}>Bookify</Text>
      </View>
      {isProfileShown && (
        <View>
          <TouchableOpacity onPress={() => setShowPopup(!showPopup)}>
            <Image
              source={require("@/assets/images/profileicon.png")}
              style={styles.profileIcon}
            />
          </TouchableOpacity>
          {showPopup && (
            <View style={styles.popup}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconBook: {
    width: 24,
    height: 24,
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  popup: {
    position: "absolute",
    top: 45,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  logoutButton: {
    paddingVertical: 8,
    width: 75,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});
