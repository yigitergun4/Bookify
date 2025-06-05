import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { FIREBASE_AUTH, FIREBASE_DB } from "@/FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import { RecommendationService } from "@/services/recommendationService";

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
  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const user = FIREBASE_AUTH.currentUser;
  const [isLoading, setIsLoading] = useState(false);
  const recommendationService = RecommendationService.getInstance();

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

  // Load popular books when genres are selected
  useEffect(() => {
    if (step === 3) {
      loadPopularBooks();
    }
  }, [step]);

  const loadPopularBooks = async () => {
    setIsLoadingBooks(true);
    try {
      const books: any[] = [];
      // bring popular books from genres
      const genreBooks =
        await recommendationService.getPopularBooks(selectedGenres);

      setPopularBooks(genreBooks);
    } catch (error) {
      console.error("Error loading popular books:", error);
      Alert.alert("Error", "Failed to load popular books. Please try again.");
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const toggleBookSelection = (book: any) => {
    setSelectedBooks((prev) => {
      if (prev.find((b) => b.id === book.id)) {
        return prev.filter((b) => b.id !== book.id);
      } else if (prev.length < 3) {
        return [...prev, book];
      }
      return prev;
    });
  };
  console.log(popularBooks, "popularBooks");
  // Step 4: Favorite Books
  const renderFavoriteBooksScreen = () => (
    <View style={styles.centered}>
      <Text style={styles.title}>Choose Your Favorite Books</Text>
      <Text style={styles.subtitleSmall}>
        Select up to 3 books from your favorite genres to get personalized
        recommendations.
      </Text>

      {isLoadingBooks ? (
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      ) : (
        <ScrollView style={styles.bookList}>
          {popularBooks.map((book) => {
            const isSelected = selectedBooks.some((b) => b.id === book.id);
            const volume = book.volumeInfo;
            let imageUrl = volume?.imageLinks?.thumbnail;
            if (imageUrl && imageUrl?.startsWith("http:")) {
              imageUrl = imageUrl?.replace("http:", "https:");
            }

            return (
              <TouchableOpacity
                key={book.id}
                style={[styles.bookCard, isSelected && styles.bookCardSelected]}
                onPress={() => toggleBookSelection(book)}
              >
                <Image
                  source={
                    imageUrl
                      ? { uri: imageUrl }
                      : require("@/assets/images/not-avaliable-book-photo.png")
                  }
                  style={styles.bookImage}
                  resizeMode="contain"
                />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {volume?.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {volume?.authors?.join(", ") || "Unknown Author"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: selectedBooks.length > 0 ? 1 : 0.8,
            backgroundColor: selectedBooks.length > 0 ? "#000" : "#ccc",
          },
        ]}
        onPress={handleDone}
        disabled={selectedBooks.length === 0}
      >
        <Text style={styles.buttonText}>
          {selectedBooks.length > 0
            ? `Continue (${selectedBooks.length}/3)`
            : "Select at least one book"}
        </Text>
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
          favoriteBooks: selectedBooks,
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
  bookList: {
    width: "100%",
    maxHeight: "70%",
  },
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bookCardSelected: {
    borderColor: "#000",
    backgroundColor: "#f8f8f8",
  },
  bookImage: {
    width: 60,
    height: 90,
    borderRadius: 6,
    marginRight: 12,
  },
  bookInfo: {
    flex: 1,
    justifyContent: "center",
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#222",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
  },
  loader: {
    marginVertical: 20,
  },
});
