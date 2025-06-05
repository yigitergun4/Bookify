import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";

// types
interface UserGoal {
  id: string;
  title: string;
  searchStrategy: string;
  categories: string[];
  description: string;
}

const GENRES = [
  "Fiction",
  "Mystery",
  "Romance",
  "Thriller",
  "Fantasy",
  "Biography",
  "Self-help",
  "Science fiction",
  "Children's",
  "Non-fiction",
  "Historical",
  "Crime fiction",
  "Travelogue",
  "Technology & Science",
  "Historical fiction",
  "Inspirational",
  "Wellness",
  "Sports",
  "Horror",
  "Dystopian",
  "Adventure",
  "Drama",
  "Poetry",
  "Philosophy",
  "Art",
];

const GOALS: UserGoal[] = [
  {
    id: "classics",
    title: "Discover Classic Literature",
    searchStrategy: "subject:classics+subject:literature",
    categories: ["Classics", "Literature", "Historical Fiction"],
    description: "Explore timeless masterpieces and literary classics",
  },
  {
    id: "contemporary",
    title: "Stay Current with Modern Books",
    searchStrategy: "subject:contemporary+subject:fiction",
    categories: ["Contemporary", "Fiction", "Modern Literature"],
    description: "Find the latest bestsellers and trending books",
  },
  {
    id: "genres",
    title: "Explore Different Genres",
    searchStrategy:
      "subject:fiction+subject:fantasy+subject:mystery+subject:romance",
    categories: ["Fantasy", "Mystery", "Romance", "Science Fiction"],
    description: "Discover books across various genres and styles",
  },
  {
    id: "authors",
    title: "Follow Favorite Authors",
    searchStrategy: "subject:fiction+subject:literature",
    categories: ["Fiction", "Literature", "Authors"],
    description: "Get recommendations based on your favorite writers",
  },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const countSelectedGenre: number = 5;
  const [goal, setGoal] = useState<(typeof GOALS)[0] | null>(null);
  const [book1, setBook1] = useState("");
  const [book2, setBook2] = useState("");
  const [book3, setBook3] = useState("");
  const user = FIREBASE_AUTH.currentUser;
  const [isLoading, setIsLoading] = useState(false);

  const handleNameChange = (text: string) => {
    const formattedText = text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    setName(formattedText);
  };
  const handleBookChange = (text: string, setter: (text: string) => void) => {
    // Capitalize first letter of each word
    const formattedText = text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    setter(formattedText);
  };

  // Step 1: Name
  const renderNameScreen = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Welcome to Bookify!</Text>
      <Text style={styles.subtitle}>What's your name?</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        autoCapitalize="words"
      />
      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: name.trim() ? 1 : 0.8,
            backgroundColor: name.trim() ? "#000" : "#ccc",
          },
        ]}
        disabled={!name.trim()}
        onPress={() => {
          handleNameChange(name);
          setStep(1);
        }}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 2: Genres
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else if (prev.length < countSelectedGenre) {
        return [...prev, genre];
      } else {
        return prev;
      }
    });
  };
  const renderGenreScreen = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Let's personalize your</Text>
      <Text style={styles.subtitle}>Choose your favorite book genres.</Text>
      <View style={styles.genreList}>
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre);
          const isDisabled =
            !isSelected && selectedGenres.length >= countSelectedGenre;
          return (
            <TouchableOpacity
              key={genre}
              style={[
                styles.genreButton,
                isSelected && styles.genreButtonSelected,
                isDisabled && { opacity: 0.5 },
              ]}
              onPress={() => toggleGenre(genre)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.genreText,
                  isSelected && styles.genreTextSelected,
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: selectedGenres.length === 0 ? 0.8 : 1,
            backgroundColor: selectedGenres.length === 0 ? "#ccc" : "#000",
          },
        ]}
        disabled={selectedGenres.length === 0}
        onPress={() => setStep(2)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 3: Goal
  const renderGoalScreen = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>What is your goal with this app?</Text>
      <View style={{ width: "100%", marginBottom: 32 }}>
        {GOALS.map((goalItem) => (
          <TouchableOpacity
            key={goalItem.id}
            style={[
              styles.goalButton,
              goal?.id === goalItem.id && styles.goalButtonSelected,
            ]}
            onPress={() =>
              setGoal((prev) => (prev?.id === goalItem.id ? null : goalItem))
            }
          >
            <Text
              style={[
                styles.goalText,
                goal?.id === goalItem.id && styles.goalTextSelected,
              ]}
            >
              {goalItem.title}
            </Text>
            <Text style={styles.goalDescription}>{goalItem.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: goal ? 1 : 0.8,
            backgroundColor: goal ? "#000" : "#ccc",
          },
        ]}
        disabled={!goal}
        onPress={() => setStep(3)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 4: Favorite Books
  const renderFavoriteBooksScreen = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Which books do you love?</Text>
      <Text style={styles.subtitleSmall}>
        Share your favorite 3 books to get personalized recommendations.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Book 1"
        value={book1}
        onChangeText={(text) => handleBookChange(text, setBook1)}
        returnKeyType="next"
        autoCorrect={false}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Book 2"
        value={book2}
        onChangeText={(text) => handleBookChange(text, setBook2)}
        editable={!!book1}
        returnKeyType="next"
        autoCorrect={false}
        autoCapitalize="words"
      />
      <TextInput
        style={styles.input}
        placeholder="Book 3"
        value={book3}
        onChangeText={(text) => handleBookChange(text, setBook3)}
        editable={!!book2}
        returnKeyType="done"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: book1 && book2 && book3 ? 1 : 0.8,
            backgroundColor: book1 && book2 && book3 ? "#000" : "#ccc",
          },
        ]}
        onPress={handleDone}
        disabled={!book1 || !book2 || !book3}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  const handleDone = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to continue.");
      return;
    }

    try {
      setIsLoading(true);
      const books = [book1, book2, book3].filter(Boolean);

      // Save all user data to Firebase
      const userRef = doc(FIREBASE_DB, "Users", user.uid);
      await setDoc(
        userRef,
        {
          name: name,
          email: user.email,
          favoriteGenres: selectedGenres,
          goal: goal
            ? {
                id: goal.id,
                title: goal.title,
                searchStrategy: goal.searchStrategy,
                categories: goal.categories,
              }
            : null,
          favoriteBooks: books.map((title) => ({
            volumeInfo: {
              title: title,
              authors: [],
              description: "",
              imageLinks: { thumbnail: "" },
            },
          })),
          firstLaunchCompleted: true,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      router.replace("/(tabs)/homefolder/home");
    } catch (error) {
      console.error("Error in handleDone:", error);
      Alert.alert(
        "Error",
        "Failed to save your preferences. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {step === 0 && renderNameScreen()}
      {step === 1 && renderGenreScreen()}
      {step === 2 && renderGoalScreen()}
      {step === 3 && renderFavoriteBooksScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  subtitleSmall: {
    fontSize: 15,
    color: "#888",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 24,
    padding: 14,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  button: {
    width: "100%",
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  genreList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 32,
    gap: 10,
  },
  genreButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  genreButtonSelected: {
    backgroundColor: "#f4f4f4",
    borderColor: "#000",
  },
  genreText: {
    fontSize: 15,
    color: "#222",
  },
  genreTextSelected: {
    color: "#000",
  },
  goalButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  goalButtonSelected: {
    backgroundColor: "#f4f4f4",
    borderColor: "#000",
  },
  goalText: {
    fontSize: 16,
    color: "#222",
  },
  goalTextSelected: {
    fontWeight: "bold",
    color: "#000",
  },
  goalDescription: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
});
