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
import { GoogleBooksItem } from "@/types/booksapitypes";
import { Ionicons } from "@expo/vector-icons";

// types
interface UserGoal {
  id: string;
  title: string;
  searchStrategy: string | ((genres: string[]) => string);
  categories: string[] | ((genres: string[]) => string[]);
  description: string;
}

const COUNTRIES: string[] = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Japan",
  "South Korea",
  "India",
  "Brazil",
  "Mexico",
  "Turkey",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Russia",
  "China",
  "Singapore",
  "New Zealand",
  "South Africa",
  "Argentina",
];

const GENRES = [
  "Fiction",
  "Mystery",
  "Novel",
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

const getGoals = (selectedGenres: string[]): UserGoal[] => {
  const unselectedGenres = GENRES.filter((g) => !selectedGenres.includes(g));

  return [
    {
      id: "classics",
      title: "Discover Classic Literature",
      searchStrategy: (genres: string[]) =>
        `subject:${genres.join("+subject:")}`,
      categories: (genres: string[]) => genres,
      description: "Explore timeless masterpieces and literary classics",
    },
    {
      id: "contemporary",
      title: "Stay Current with Modern Books",
      searchStrategy: (genres: string[]) =>
        `subject:${genres.join("+subject:")}`,
      categories: (genres: string[]) => genres,
      description: "Find the latest bestsellers and trending books",
    },
    {
      id: "genres",
      title: `Explore Selected & Other Genres`,
      searchStrategy: (genres: string[]) =>
        `subject:${[...genres, ...unselectedGenres].join("+subject:")}`,
      categories: (genres: string[]) => [...genres, ...unselectedGenres],
      description:
        "Discover books across your favorite and other genres you may not know yet",
    },
    {
      id: "authors",
      title: "Follow Favorite Authors",
      searchStrategy: (genres: string[]) =>
        `subject:${genres.join("+subject:")}`,
      categories: (genres: string[]) => genres,
      description: "Get recommendations based on your favorite writers",
    },
  ];
};

export default function OnboardingFlow() {
  const [step, setStep] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const countSelectedGenre: number = 5;
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [selectedBooks, setSelectedBooks] = useState<any[]>([]);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const user = FIREBASE_AUTH.currentUser;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const recommendationService = RecommendationService.getInstance();
  const maxSelectedBooks: number = 5; // Maximum number of books user can select

  const handleNameChange = (text: string) => {
    const formattedText = text
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    setName(formattedText);
  };

  const handleBack = () => {
    if (step > 0) {
      if (step === 4) {
        setPopularBooks([]);
        setSelectedBooks([]);
      }
      setStep(step - 1);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {step > 0 && (
        <TouchableOpacity
          style={{ position: "absolute", left: 0, zIndex: 10 }}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      )}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === step && styles.progressDotActive,
              index < step && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>
    </View>
  );

  // Step 1: Name
  const renderNameScreen = () => (
    <View style={styles.centered}>
      {renderHeader()}
      <View style={{ width: "100%", marginTop: "50%" }}>
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
      {renderHeader()}
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

  // Step 3: Country Selection
  const renderCountryScreen = () => (
    <View style={styles.centered}>
      {renderHeader()}
      <Text style={styles.title}>Where are you from?</Text>
      <Text style={styles.subtitle}>
        Select your country to get localized recommendations.
      </Text>

      <View style={styles.countryList}>
        {COUNTRIES.map((country) => (
          <TouchableOpacity
            key={country}
            style={[
              styles.countryButton,
              selectedCountry === country && styles.countryButtonSelected,
            ]}
            onPress={() => setSelectedCountry(country)}
          >
            <Text
              style={[
                styles.countryText,
                selectedCountry === country && styles.countryTextSelected,
              ]}
            >
              {country}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          {
            opacity: selectedCountry ? 1 : 0.8,
            backgroundColor: selectedCountry ? "#000" : "#ccc",
          },
        ]}
        disabled={!selectedCountry}
        onPress={() => setStep(3)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const goals = getGoals(selectedGenres);
  // Step 4: Goal
  const renderGoalScreen = () => (
    <View style={styles.centered}>
      {renderHeader()}
      <Text style={styles.title}>What is your goal with this app?</Text>
      <View style={{ width: "100%", marginBottom: 20 }}>
        {goals.map((goalItem: UserGoal) => {
          const searchStrategy =
            typeof goalItem.searchStrategy === "function"
              ? goalItem.searchStrategy(selectedGenres)
              : goalItem.searchStrategy;

          const categories =
            typeof goalItem.categories === "function"
              ? goalItem.categories(selectedGenres)
              : goalItem.categories;

          return (
            <TouchableOpacity
              key={goalItem.id}
              style={[
                styles.goalButton,
                goal?.id === goalItem.id && styles.goalButtonSelected,
              ]}
              onPress={() =>
                setGoal((prev) =>
                  prev?.id === goalItem.id
                    ? null
                    : {
                        ...goalItem,
                        searchStrategy,
                        categories,
                      }
                )
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
          );
        })}
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
        onPress={() => setStep(4)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // Load popular books when genres are selected
  useEffect(() => {
    const loadBooks = async () => {
      if (step === 4 && !isLoadingBooks && popularBooks.length === 0) {
        setIsLoadingBooks(true);
        try {
          // bring popular books from genres
          const genreBooks: GoogleBooksItem[] =
            await recommendationService.getPopularBooks({
              favoriteGenres: selectedGenres,
              selectedCountry: selectedCountry,
            });
          setPopularBooks(genreBooks);
        } catch (error) {
          console.log("[Onboarding] Error loading popular books:", error);
        } finally {
          setIsLoadingBooks(false);
        }
      }
    };

    loadBooks();
  }, [step]);

  const toggleBookSelection = (book: GoogleBooksItem) => {
    setSelectedBooks((prev) => {
      // Check if the book is already selected
      const isAlreadySelected = prev.some((b) => b.id === book.id);

      if (isAlreadySelected) {
        // If already selected, remove it
        return prev.filter((b) => b.id !== book.id);
      } else if (prev.length < maxSelectedBooks) {
        // If not selected and under max limit, add it
        return [...prev, book];
      }
      // If at max limit, don't change selection
      return prev;
    });
  };
  // Step 5: Favorite Books
  const renderFavoriteBooksScreen = () => (
    <View style={styles.centered}>
      {renderHeader()}
      <Text style={styles.title}>Choose Your Favorite Books</Text>
      <Text style={styles.subtitleSmall}>
        Select up to {maxSelectedBooks} books from your favorite genres to get
        personalized recommendations.
      </Text>
      {isLoadingBooks ? (
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.bookList}
          showsVerticalScrollIndicator={false}
        >
          {popularBooks.map((book: GoogleBooksItem) => {
            const isSelected: boolean = selectedBooks.some(
              (b: GoogleBooksItem) => b.id === book.id
            );
            const isDisabled: boolean =
              !isSelected && selectedBooks.length >= maxSelectedBooks;
            const volume: any = book.volumeInfo;
            let imageUrl: string | undefined = volume?.imageLinks?.thumbnail;
            if (imageUrl && imageUrl?.startsWith("http:")) {
              imageUrl = imageUrl?.replace("http:", "https:");
            }

            return (
              <TouchableOpacity
                key={book.id}
                style={[
                  styles.bookCard,
                  isSelected && styles.bookCardSelected,
                  isDisabled && styles.bookCardDisabled,
                ]}
                onPress={() => toggleBookSelection(book)}
                disabled={isDisabled}
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
            ? `Done (${selectedBooks.length}/${maxSelectedBooks})`
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
          country: selectedCountry,
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
      console.log("[Onboarding] Error in handleDone:", error);
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
      {step === 2 && renderCountryScreen()}
      {step === 3 && renderGoalScreen()}
      {step === 4 && renderFavoriteBooksScreen()}
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
    justifyContent: "flex-start",
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
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  genreButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  bookCardDisabled: {
    opacity: 0.5,
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
  countryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  countryButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  countryButtonSelected: {
    backgroundColor: "#f4f4f4",
    borderColor: "#000",
  },
  countryText: {
    fontSize: 15,
    color: "#222",
  },
  countryTextSelected: {
    color: "#000",
    fontWeight: "600",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e0e0e0",
  },
  progressDotActive: {
    backgroundColor: "#000",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressDotCompleted: {
    backgroundColor: "#666",
  },
});
