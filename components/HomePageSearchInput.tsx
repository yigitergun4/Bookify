import { useState, useEffect } from "react";
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
  onSubmit?: () => void;
  value?: string;
}

export default function SearchInput({
  isHomePage,
  onSearchChange,
  isSubmitButtonShown = true,
  onSubmit,
  value = "",
}: HomePageSearchInputProps) {
  const [search, setSearch] = useState<string>(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleSearch: () => void = () => {
    if (search.trim()) {
      if (isHomePage) {
        router.push({
          pathname: "/(tabs)/homefolder/SearchResults",
          params: { query: search },
        });
      } else if (onSubmit) {
        onSubmit();
      }
    }
  };

  const handleTextChange: (text: string) => void = (text: string) => {
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
        autoCorrect={false}
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
}

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
