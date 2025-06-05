import { FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { CacheService } from "./cacheService";
import { ApiError } from "../utils/apiUtils";
import { GoogleBooksItem } from "@/types/booksapitypes";
import ENV from "@/config/env";

const cacheService = CacheService.getInstance();

export class RecommendationError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "RecommendationError";
  }
}

interface UserGoal {
  id: string;
  title: string;
  searchStrategy: string;
  categories: string[];
  description: string;
}

export class RecommendationService {
  private static instance: RecommendationService;

  private constructor() {}

  static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  private mixBooksFromQueries(results: any[][]): any[] {
    const mixedBooks: any[] = [];
    const seenIds = new Set<string>();

    // First, flatten all results into a single array
    const allBooks = results.flat();

    // Then add books one by one, ensuring no duplicates
    for (const book of allBooks) {
      if (book && !seenIds.has(book.id)) {
        mixedBooks.push(book);
        seenIds.add(book.id);
      }
    }

    return mixedBooks;
  }

  async searchBooksWithQuery(query: string): Promise<any[]> {
    try {
      console.log("[RecommendationService] Searching with query:", query);
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=10&orderBy=relevance`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("[RecommendationService] Error searching books:", error);
      throw error;
    }
  }

  async getRecommendations(
    userId: string,
    userPreferences?: {
      favoriteGenres?: string[];
      favoriteBooks?: any[];
      readBooks?: any[];
      libraryBooks?: any[];
      userGoal?: any[];
    }
  ): Promise<any[]> {
    try {
      // If user preferences are provided, use them directly
      if (userPreferences) {
        const {
          favoriteGenres = [],
          favoriteBooks = [],
          readBooks = [],
          libraryBooks = [],
          userGoal = [],
        } = userPreferences;

        // Create multiple search queries
        const prompt = `Generate 5 diverse and creative search queries for the Google Books API based on these preferences:
- Favorite Genres: ${favoriteGenres.join(", ")}
- Favorite Books: ${favoriteBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- Books already read: ${readBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- User's reading goals: ${userGoal?.map((goal: any) => goal.title).join(", ")}
- User's library: ${libraryBooks.map((book: any) => book.volumeInfo?.title).join(", ")}

Instructions:
1. Do not repeat the exact titles from the favoriteBooks or library lists.
2. Instead of directly using favorite book titles,after a time used exact titles, use them as inspiration to create queries involving similar authors, subgenres, themes, or time periods. 
3. Each query should be unique, specific, and tailored to the user's tastes.
4. Include a variety of genre-based, author-based, and theme-based queries.
5. Avoid vague or generic terms like "good books" or "bestsellers."
6. Format: Return ONLY the final queries, one per line, without numbering or extra text.`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.8,
              max_tokens: 1000,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate queries with ChatGPT");
        }

        const data = await response.json();
        const generatedQueries = data.choices[0].message.content
          .split("\n")
          .filter(Boolean)
          .map((query: string) => query.trim());

        // Get books from all queries in parallel
        const allResults = await Promise.all(
          generatedQueries.map((query: string) =>
            this.searchBooksWithQuery(query)
          )
        );

        // Mix books from all queries
        const mixedBooks = this.mixBooksFromQueries(allResults);

        // Filter out books that are already in the library
        const libraryBookIds = new Set(
          libraryBooks.map((book: any) => book.id)
        );
        return mixedBooks.filter((book: any) => !libraryBookIds.has(book.id));
      }

      // If no preferences provided, fetch from Firebase
      const userRef = doc(FIREBASE_DB, "Users", userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData) {
        throw new Error("User data not found");
      }

      const favoriteGenres = userData.favoriteGenres || [];
      const favoriteBooks = userData.favoriteBooks || [];
      const readBooks = userData.readBooks || [];
      const libraryBooks = userData.library || [];

      // Create multiple search queries
      const prompt = `Generate 5 diverse and creative search queries for Google Books API based on these preferences:
      - Favorite Genres: ${favoriteGenres.join(", ")}
      - Favorite Books: ${favoriteBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
      - Books already read: ${readBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
      
      Requirements:
      1. Each query should be specific and targeted
      2. Include a mix of genre-based, author-based, and theme-based queries
      3. Avoid generic terms
      4. Use exact genre names, author names, or specific themes
      5. Format: Return ONLY the queries, one per line, no numbering or additional text`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate queries with ChatGPT");
      }

      const data = await response.json();
      const generatedQueries = data.choices[0].message.content
        .split("\n")
        .filter(Boolean)
        .map((query: string) => query.trim());

      // Get books from all queries in parallel
      const allResults = await Promise.all(
        generatedQueries.map((query: string) =>
          this.searchBooksWithQuery(query)
        )
      );

      // Mix books from all queries
      const mixedBooks = this.mixBooksFromQueries(allResults);

      // Filter out books that are already in the library
      const libraryBookIds = new Set(libraryBooks.map((book: any) => book.id));
      return mixedBooks.filter((book: any) => !libraryBookIds.has(book.id));
    } catch (error) {
      console.error(
        "[RecommendationService] Error getting recommendations:",
        error
      );
      throw error;
    }
  }

  async getChatGPTRecommendations(
    favoriteGenres: string[],
    favoriteBooks: GoogleBooksItem[],
    readBooks: GoogleBooksItem[],
    userGoal?: UserGoal
  ): Promise<string[]> {
    try {
      const prompt = `You are a book recommendation assistant.

      A user is interested in the following preferences:
      - Favorite Genres: ${favoriteGenres.join(", ")}
      - Favorite Books: ${favoriteBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Books already read: ${readBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Reading Goal: ${userGoal?.title || "General reading"}
      
      Your task is to generate 3 diverse and creative search query strings that can be used with the Google Books API to find highly relevant book results.
      
      ${
        userGoal?.id === "classics"
          ? `Based on the user's favorite genres (${favoriteGenres.join(", ")}), create queries that focus on classic literature in these genres. Consider books that have stood the test of time and influenced the genre.`
          : userGoal?.id === "contemporary"
            ? `Looking at the user's favorite books (${favoriteBooks.map((book) => book.volumeInfo?.title).join(", ")}), create queries for modern books with similar themes, writing styles, or authors. Focus on recent publications that match their taste.`
            : userGoal?.id === "genres"
              ? `The user enjoys ${favoriteGenres.join(", ")}. Create queries that explore different subgenres and cross-genre works within these categories. Include both popular and niche books in these genres.`
              : userGoal?.id === "authors"
                ? `Based on the authors in the user's favorite books (${favoriteBooks
                    .map((book) => book.volumeInfo?.authors?.[0])
                    .filter(Boolean)
                    .join(
                      ", "
                    )}), create queries that find books with similar writing styles, themes, or from the same literary movement.`
                : `Create diverse queries that combine the user's favorite genres (${favoriteGenres.join(", ")}) and books (${favoriteBooks.map((book) => book.volumeInfo?.title).join(", ")}). Consider their reading history (${readBooks.map((book) => book.volumeInfo?.title).join(", ")}) to avoid repetition.`
      }
      
      Each query should be specific and targeted, avoiding generic terms. Use exact genre names, author names, or specific themes from their preferences. Avoid repeating books they've already read.
      
      Return ONLY the 3 queries. Each on a new line. Do NOT include any explanation, labels, or formatting.`;
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.85,
            max_tokens: 1000,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `ChatGPT API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from ChatGPT API");
      }

      const queries = data.choices[0].message.content
        .split("\n")
        .filter(Boolean)
        .map((query: string) => query.trim());
      console.log(queries, "queries, : recommendationService:269");
      if (queries.length === 0) {
        throw new Error("No queries generated by ChatGPT");
      }

      return queries;
    } catch (error) {
      console.log("Error getting ChatGPT recommendations:", error);
      // Return random fallback queries if ChatGPT fails
      function getRandom<T>(arr: T[], fallback: T): T {
        return arr.length > 0
          ? arr[Math.floor(Math.random() * arr.length)]
          : fallback;
      }
      return [
        `subject:${getRandom(favoriteGenres, "fiction")}`,
        `inauthor:"${getRandom(
          favoriteBooks.map((b) => b.volumeInfo?.authors?.[0]).filter(Boolean),
          "J.K. Rowling"
        )}"`,
        `intitle:"${getRandom(
          favoriteBooks.map((b) => b.volumeInfo?.title),
          "The"
        )}"`,
      ];
    }
  }

  async deleteRecommendations(userId: string): Promise<void> {
    try {
      // Delete from Firebase subcollection
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const recommendationsSnap = await getDocs(recommendationsRef);

      const deletePromises = recommendationsSnap.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Clear cache
      await cacheService.delete(`recommended_books_${userId}`);

      console.log(
        "[RecommendationService] Cleared all recommendations for user:",
        userId
      );
    } catch (error) {
      console.log(
        "[RecommendationService] Error deleting recommendations:",
        error
      );
      throw error;
    }
  }

  async removeBookFromRecommendations(userId: string, bookId: string) {
    try {
      const recRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const snapshots = await getDocs(recRef);

      for (const snap of snapshots.docs) {
        const data = snap.data();
        const filteredBooks = (data.books || []).filter(
          (b: any) => b.id !== bookId
        );
        await updateDoc(doc(recRef, snap.id), { books: filteredBooks });
      }

      // Also update cache
      const cachedBooks = await cacheService.getRecommendedBooks(userId);
      if (cachedBooks) {
        const filteredCachedBooks = cachedBooks.filter(
          (b: any) => b.id !== bookId
        );
        await cacheService.saveRecommendedBooks(userId, filteredCachedBooks);
      }
    } catch (error) {
      console.log(
        "[RecommendationService] Error removing book from recommendations:",
        error
      );
      throw error;
    }
  }

  async saveRecommendations(
    userId: string,
    books: GoogleBooksItem[]
  ): Promise<void> {
    try {
      // Create a new document in the Recommendations subcollection
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );

      // Add the new recommendations with timestamp
      await addDoc(recommendationsRef, {
        books: books,
        createdAt: new Date().toISOString(),
        totalBooks: books.length,
      });

      // Save to cache
      await cacheService.saveRecommendedBooks(userId, books);
      console.log(
        `[RecommendationService] Saved ${books.length} books to cache and Firebase`
      );
    } catch (error) {
      console.log(
        "[RecommendationService] Error saving recommendations:",
        error
      );
      throw error;
    }
  }
}
