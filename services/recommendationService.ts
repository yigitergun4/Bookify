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
import ENV from "@/config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";

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
    console.log("[getRecommendations] Called with:", {
      userId,
      hasUserPreferences: !!userPreferences,
      preferences: userPreferences,
    });
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
        const prompt = `You are a book recommendation assistant generating search queries for the Google Books API.

User Preferences:
- Favorite Genres: ${favoriteGenres.join(", ")}
- Favorite Books: ${favoriteBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- Books already read: ${readBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- User's reading goals: ${userGoal?.map((goal: any) => goal.title).join(", ")}
- User's library: ${libraryBooks.map((book: any) => book.volumeInfo?.title).join(", ")}

Instructions:
1. Generate 5 diverse and creative search queries.
2. Do NOT use the exact titles listed in favoriteBooks or user's library.
3. Instead, identify patterns such as genres, themes, historical periods, writing styles, or author types from those books and base queries on that.
4. Include a mix of genre-based, author-inspired, and theme-driven queries. Use rich, specific keywords.
5. Promote discovery. Suggest queries that might expand the user's interests without straying too far.
6. Do NOT use generic terms like "great books" or "popular books."
7. Format: Return only the 5 queries, one per line. No bullet points, numbers, or extra text.`;

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
    libraryBooks: GoogleBooksItem[],
    userGoal?: UserGoal
  ): Promise<string[]> {
    console.log("[getChatGPTRecommendations] Called with:", {
      favoriteGenres,
      favoriteBooksCount: favoriteBooks.length,
      readBooksCount: libraryBooks.length,
      userGoal,
    });
    try {
      const recommendationThresholdForLibraryBasedPrompt: number = 10;
      const useLibraryBasedPrompt =
        libraryBooks.length > recommendationThresholdForLibraryBasedPrompt;
      const prompt = `You are a smart book recommendation assistant.
      
      User preferences:
      ${useLibraryBasedPrompt ? "" : `- Favorite Genres (initial selection): ${favoriteGenres.join(", ")}`}
      - Favorite Books: ${favoriteBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Books already read or owned: ${libraryBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Reading Goal: ${userGoal?.title || "General reading"}
      
      Your task:
      Generate 3 highly creative and specific Google Books API search query strings based on the user's preferences.
      
      ${
        useLibraryBasedPrompt
          ? `This user has read many books. Focus mostly on:
      - Their actual reading history (books read or owned).
      - Suggest books that are commonly read by similar readers.
      - Identify patterns or themes in their past reads and use that to build queries.
      
      Use favorite genres only as a minor reference for variety.`
          : `The user is new or has fewer reads. Focus on:
      - Their selected favorite genres and favorite books.
      - Generate diverse queries using genres, authors, and themes from those books.`
      }
      
      Avoid:
      - Repeating books from their library.
      - Recommending books by the same author unless it's essential.
      - Using vague or generic search terms.
      
      Format:
      Return only 3 search queries, each on a new line. No numbering or explanation.`;

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
      console.log("[getChatGPTRecommendations] Error:", error);
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

  async getPopularBooks({
    favoriteGenres,
    selectedCountry,
  }: {
    favoriteGenres: string[];
    selectedCountry: string;
  }): Promise<GoogleBooksItem[]> {
    const prompt = `You are a smart book recommendation assistant.
  
  User preferences:
  - Favorite Genres: ${favoriteGenres.join(", ")}
  - Country: ${selectedCountry}
  
  Your task has TWO parts:
  
  1. Generate 3 highly relevant Google Books API search queries based on the user's favorite genres.
     - Prioritize books that are popular, award-winning, or critically acclaimed in ${selectedCountry}.
     - Use keywords like: bestseller, award-winning, popular in ${selectedCountry}, trending, etc.
  
  2. Then list 5 of the most famous or widely-read authors from ${selectedCountry}.
  
  Return format:
  - First 3 queries (one per line).
  - Then list 5 authors as "- Author Name"
  - No extra explanation.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    const lines = content
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean);
    const queries = lines
      .filter((line: string) => !line.startsWith("-"))
      .slice(0, 3);
    const authors = lines
      .filter((line: string) => line.startsWith("-"))
      .map((line: string) => line.replace(/^- /, ""));

    const bookListsFromQueries = await Promise.all(
      queries.map(async (query: string) => {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
            query
          )}&printType=books&maxResults=40`
        );
        const json = await res.json();
        return json.items || [];
      })
    );

    const bookListsFromAuthors = await Promise.all(
      authors.map(async (author: string) => {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(
            author
          )}&printType=books&maxResults=40`
        );
        const json = await res.json();
        return json.items || [];
      })
    );

    const allBooks = [...bookListsFromQueries, ...bookListsFromAuthors].flat();

    const uniqueBooksMap = new Map<string, GoogleBooksItem>();
    for (const book of allBooks) {
      if (book?.id && !uniqueBooksMap.has(book.id)) {
        uniqueBooksMap.set(book.id, book);
      }
    }

    // Convert Map to Array and shuffle
    const uniqueBooks = Array.from(uniqueBooksMap.values());
    uniqueBooks.sort(() => Math.random() - 0.5);

    return uniqueBooks;
  }
}
