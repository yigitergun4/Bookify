import {
  Animated,
  Image,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native';
import { Text, View } from '@/components/Themed';
import HomePageSearchInput from "@/components/HomePageSearchInput";
import ScrollView = Animated.ScrollView;
import BookCard from "@/components/SearchPageBooksCard";
import CameraButton from "@/components/CameraButton";
import {router} from "expo-router";


export default function TabTwoScreen() {

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container2}>
          <View style={styles.discoverView}>
            <Text style={styles.discoverText}>
              Discover
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              <Image source={require("@/assets/images/bookimage.png")} style={styles.myProfileImage} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBarView}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/reading")}>
              <Image source={require("@/assets/images/searchpagebookicon.png")} style={styles.searchInputBookIcon}/>
            </TouchableOpacity>
            <View style={styles.searchbarInputView}>
              <HomePageSearchInput isHomePage={false} />
            </View>
            <TouchableOpacity onPress={() => {}}>
              <CameraButton/>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 190 }} showsVerticalScrollIndicator={false}>
            <View style={styles.booksCardContainer}>
              <BookCard
                  title="Fantasy Adventure"
                  description="Immerse yourself in the world of books and adventure through the pages of fantasy and"
                  author="JACKY CHAN TRAMISU JHONSON"
                  image={require('@/assets/images/bookimage.png')}
                  isFavorite={true}
                  onPressFavorite={() => {}}
              />
              <BookCard
                  title="Sci-Fi Saga"
                  description="Explore the futuristic world of science fiction with thrilling plot twists and technological marvels with thrilling plot twists and technological marvels."
                  author="JACKY CHAN TRAMISU JHONSON"
                  image={require('@/assets/images/bookimage3.png')}
                  isFavorite={true}
                  onPressFavorite={() => {}}
              />
              <BookCard
                  title="Fantasy Adventure"
                  description="Immerse yourself in the world of books and adventure through the pages of fantasy and"
                  author="JACKY CHAN TRAMISU JHONSON"
                  image={require('@/assets/images/bookimage2.png')}
                  isFavorite={true}
                  onPressFavorite={() => {}}
              />
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  container2: {
    paddingHorizontal:25,
    backgroundColor: '#FFF',
  },
  discoverView: {
    marginTop:25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },
  discoverText:{
    color: '#030303',
    fontSize: 46,
    fontFamily: 'Poppins',
    fontWeight: 700,
    lineHeight: 54,
  },
  myProfileImage: {
    height:40,
    width:40,
    borderRadius:40,
  },
  searchBarView:{
    marginTop:30,
    paddingBottom:15,
    alignItems: 'center',
    justifyContent:"space-between",
    flexDirection: 'row',
    backgroundColor: '#FFF',
  },
  searchbarInputView:{
    width:"85%",
    backgroundColor:'#fff',
    paddingLeft:13
  },
  searchInputBookIcon: {
    height:20,
    width:20,
  },
  booksCardContainer: {
    gap:15,
    backgroundColor: '#FFF',
  }
});
