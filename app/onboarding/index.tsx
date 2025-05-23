import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";

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
  "Fitness & Exercise",
];

const GOALS = [
  "Find new books to read",
  "Track my reading habits",
  "Join a reading community",
  "Improve my reading skills",
];

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [goal, setGoal] = useState("");
  const [book1, setBook1] = useState("");
  const [book2, setBook2] = useState("");
  const [book3, setBook3] = useState("");
  const user = FIREBASE_AUTH.currentUser;

  function toTitleCase(str: string) {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

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
      />
      <TouchableOpacity
        style={styles.button}
        disabled={!name.trim()}
        onPress={() => setStep(1)}
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
      } else if (prev.length < 3) {
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
          const isDisabled = !isSelected && selectedGenres.length >= 3;
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
        style={styles.button}
        disabled={selectedGenres.length !== 3}
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
        {GOALS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.goalButton, goal === g && styles.goalButtonSelected]}
            onPress={() => setGoal(g)}
          >
            <Text
              style={[styles.goalText, goal === g && styles.goalTextSelected]}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={styles.button}
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
        onChangeText={setBook1}
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Book 2"
        value={book2}
        onChangeText={setBook2}
        editable={!!book1}
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Book 3"
        value={book3}
        onChangeText={setBook3}
        editable={!!book2}
        returnKeyType="done"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleDone}
        disabled={!book1 || !book2 || !book3}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );

  async function handleDone() {
    if (!user) return;
    const userRef = doc(FIREBASE_DB, "Users", user.uid);
    await setDoc(
      userRef,
      {
        name: toTitleCase(name),
        email: user.email,
        favoriteGenres: selectedGenres,
        goal,
        favoriteBooks: [book1, book2, book3].map(toTitleCase),
        firstLaunchCompleted: true,
      },
      { merge: true }
    );

    router.replace("/(tabs)/homefolder/home");
  }

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
    fontWeight: "bold",
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
});
