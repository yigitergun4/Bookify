import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Text } from "@/components/Themed";
import HomePageSearchInput from "@/components/HomePageSearchInput";
import HomePageFlatlistRecommendedBooks from "@/components/HomePageFlatlistRecommendedBooks";
import HomePageGenres from "@/components/HomePageFlatlistGenres";
import { router } from "expo-router";

export default function TabOneScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grayBackGround}>
          <Text style={styles.grayBackGroundText}>Find your next read</Text>
        </View>
        <View style={styles.container2}>
          <View style={styles.searchInput}>
            <HomePageSearchInput isHomePage={true} />
          </View>
          <View style={styles.recommendedView}>
            <View style={styles.recommendedView2}>
              <Text style={styles.recommendedText}>Recommended for you</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push("/(tabs)/homefolder/recommendbookpage")
                }
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <View>
              <HomePageFlatlistRecommendedBooks />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container2: {
    paddingHorizontal: 25,
    backgroundColor: "#FFF",
  },
  grayBackGround: {
    backgroundColor: "#d3d3d3",
    justifyContent: "center",
    height: 200,
    width: "100%",
    paddingHorizontal: 25,
  },
  grayBackGroundText: {
    color: "#030303",
    fontSize: 30,
    fontFamily: "Poppins",
    fontWeight: "700",
  },
  searchInput: {
    marginTop: -25,
    borderRadius: 25,
  },
  recommendedView: {
    marginTop: 50,
    backgroundColor: "#FFF",
  },
  recommendedView2: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendedText: {
    color: "#030303",
    fontSize: 18,
    fontFamily: "Poppins",
    fontWeight: "600",
  },
  seeAllText: {
    textDecorationLine: "underline",
    color: "black",
  },
});
