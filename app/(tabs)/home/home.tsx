import {SafeAreaView, StyleSheet, TouchableOpacity} from 'react-native';
import { Text, View } from '@/components/Themed';
import HomePageSearchInput from "@/components/HomePageSearchInput";
import HomePageFlatlistRecommendedBooks from "@/components/HomePageFlatlistRecommendedBooks";
import HomePageGenres from "@/components/HomePageFlatlistGenres";
import {router} from "expo-router";

export default function TabOneScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.grayBackGround}>
        <Text style={styles.grayBackGroundText}>
          Find your next read
        </Text>
      </View>
      <View style={styles.container2}>
        <View style={styles.searchInput}>
          <HomePageSearchInput/>
        </View>
        <View style={styles.recommendedView}>
          <View style={styles.recommendedView2}>
            <Text style={styles.recommendedText}>
              Recommended for you
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/home/recommendbookpage")}>
              <Text style={styles.seeAllText}>
                See all
              </Text>
            </TouchableOpacity>
          </View>
          <HomePageFlatlistRecommendedBooks/>
        </View>
        <View style={styles.genresView}>
          <Text style={styles.genresText}>
            Genres
          </Text>
          <HomePageGenres/>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container2: {
    flex:1,
    paddingHorizontal: 25,
  },
  grayBackGround:{
    backgroundColor:"#d3d3d3",
    justifyContent:"center",
    height:200,
    width:"100%",
    paddingHorizontal:25
  },
  grayBackGroundText: {
    color:"#030303",
    fontSize: 30,
    fontFamily: 'Poppins',
    fontWeight: 700,
  },
  searchInput: {
    marginTop:-25,
    borderRadius:25
  },
  recommendedView:{
    marginTop: 50,
  },
  recommendedView2:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between"
  },
  recommendedText:{
    color: '#030303',
    fontSize: 18,
    fontFamily: 'Poppins',
    fontWeight: 600,
  },
  seeAllText:{
    textDecorationLine:"underline"
  },
  genresView:{
    marginTop:50,
  },
  genresText:{
    color: '#030303',
    fontSize: 18,
    lineHeight:22,
    fontFamily: 'Poppins',
    fontWeight: 600,
  }
});
