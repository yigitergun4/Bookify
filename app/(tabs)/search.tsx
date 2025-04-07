import {Image, SafeAreaView, StyleSheet} from 'react-native';
import { Text, View } from '@/components/Themed';

export default function TabTwoScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container2}>
       <View style={styles.discoverView}>
         <Text style={styles.discoverText}>
           Discover
         </Text>
         <Image source={require("@/assets/images/bookimage.png")} style={styles.myProfileImage} />
       </View>
        <View>
          <Image source={require("@/assets/images/searchpagebookicon.png")} style={{height:20,width:20}}/>
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
    paddingHorizontal:25,
  },
  discoverView: {
    marginTop:25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  }
});
