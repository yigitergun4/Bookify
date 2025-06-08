import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

export default function PrepairingApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preparing your Bookify...</Text>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fdfedb",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
