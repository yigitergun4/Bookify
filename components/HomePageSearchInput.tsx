import { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

interface HomePageSearchInputProps {
  isHomePage: boolean;
  onSearchChange?: (text: string) => void;
  isSubmitButtonShown?: boolean;
}

const SearchInput = ({
  isHomePage,
  onSearchChange,
  isSubmitButtonShown = true,
}: HomePageSearchInputProps) => {
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    if (search.trim()) {
      if (isHomePage) {
        router.push({
          pathname: "/(tabs)/homefolder/SearchResults",
          params: { query: search },
        });
      }
    }
  };

  const handleTextChange = (text: string) => {
    setSearch(text);
    if (onSearchChange) {
      onSearchChange(text);
    }
  };

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        placeholder="Search for books..."
        style={styles.input}
        placeholderTextColor="#18181a"
        value={search}
        onChangeText={handleTextChange}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      {isSubmitButtonShown && (
        <TouchableOpacity onPress={handleSearch}>
          <Image
            source={require("@/assets/images/homepagesearchicon.png")}
            style={styles.icon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d6d6db",
    borderRadius: 24,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    height: 52,
    width: "100%",
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#18181a",
  },
  icon: {
    width: 17,
    height: 17,
    marginLeft: 8,
  },
});

export default SearchInput;
