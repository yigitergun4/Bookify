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
    const seenIds: Set<string> = new Set<string>();

    // First, flatten all results into a single array
    const allBooks: GoogleBooksItem[] = results.flat();

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
      const response: any = await fetch(
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

  async c(
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
          favoriteGenres = [] as string[],
          favoriteBooks = [] as GoogleBooksItem[],
          readBooks = [] as GoogleBooksItem[],
          libraryBooks = [] as GoogleBooksItem[],
          userGoal = [] as UserGoal[],
        } = userPreferences;

        // Create multiple search queries
        const prompt: string = `You are a book recommendation assistant generating search queries for the Google Books API.

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

        const response: any = await fetch(
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

        const data: any = await response.json();
        const generatedQueries: string[] = data.choices[0].message.content
          .split("\n")
          .filter(Boolean)
          .map((query: string) => query.trim());

        // Get books from all queries in parallel
        const allResults: any[] = await Promise.all(
          generatedQueries.map((query: string) =>
            this.searchBooksWithQuery(query)
          )
        );

        // Mix books from all queries
        const mixedBooks: GoogleBooksItem[] =
          this.mixBooksFromQueries(allResults);

        // Filter out books that are already in the library
        const libraryBookIds: Set<string> = new Set(
          libraryBooks.map((book: any) => book.id)
        );
        return mixedBooks.filter((book: any) => !libraryBookIds.has(book.id));
      }

      // If no preferences provided, fetch from Firebase
      const userRef: any = doc(FIREBASE_DB, "Users", userId);
      const userSnap: any = await getDoc(userRef);
      const userData: any = userSnap.data();

      if (!userData) {
        throw new Error("User data not found");
      }

      const favoriteGenres: string[] = userData.favoriteGenres || [];
      const favoriteBooks: GoogleBooksItem[] = userData.favoriteBooks || [];
      const readBooks: GoogleBooksItem[] = userData.readBooks || [];
      const libraryBooks: GoogleBooksItem[] = userData.library || [];

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

      const data: any = await response.json();
      const generatedQueries: string[] = data.choices[0].message.content
        .split("\n")
        .filter(Boolean)
        .map((query: string) => query.trim());

      // Get books from all queries in parallel
      const allResults: any[] = await Promise.all(
        generatedQueries.map((query: string) =>
          this.searchBooksWithQuery(query)
        )
      );

      // Mix books from all queries
      const mixedBooks: GoogleBooksItem[] =
        this.mixBooksFromQueries(allResults);

      // Filter out books that are already in the library
      const libraryBookIds: Set<string> = new Set(
        libraryBooks.map((book: any) => book.id)
      );
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
      const useLibraryBasedPrompt: boolean =
        libraryBooks.length > recommendationThresholdForLibraryBasedPrompt;
      const prompt: string = `You are a smart book recommendation assistant.
      
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
          favoriteBooks
            .map((book) => book.volumeInfo?.authors?.[0])
            .filter(Boolean),
          "J.K. Rowling"
        )}"`,
        `intitle:"${getRandom(
          favoriteBooks.map((book) => book.volumeInfo?.title),
          "The"
        )}"`,
      ];
    }
  }

  async deleteRecommendations(userId: string): Promise<void> {
    try {
      // Delete from Firebase subcollection
      const recommendationsRef: any = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const recommendationsSnap: any = await getDocs(recommendationsRef);

      const deletePromises: Promise<void>[] = recommendationsSnap.docs.map(
        (doc: any) => deleteDoc(doc.ref)
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
      const snapshots: any = await getDocs(recRef);

      for (const snap of snapshots.docs) {
        const data: any = snap.data();
        const filteredBooks: GoogleBooksItem[] = (data.books || []).filter(
          (book: any) => book.id !== bookId
        );
        await updateDoc(doc(recRef, snap.id), { books: filteredBooks });
      }

      // Also update cache
      const cachedBooks: GoogleBooksItem[] =
        await cacheService.getRecommendedBooks(userId);
      if (cachedBooks) {
        const filteredCachedBooks: GoogleBooksItem[] = cachedBooks.filter(
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
    const genreCount: number = favoriteGenres.length;
    const genreList: string = favoriteGenres.join(", ");

    const prompt: string =
      genreCount === 1
        ? `List 10 well-known authors from ${selectedCountry} who are known specifically for writing in the "${favoriteGenres[0]}" genre. For each author, also provide a list of their most popular 50 book titles. Format:
  - Author Name
    - Book 1
    - Book 2
    ...`
        : `For each of the following genres: ${genreList}, list 5 well-known or influential authors from ${selectedCountry} who are known specifically for that genre. For each author, list their most popular 50 books. Format:
  
  Genre: [Genre Name]
  - Author Name
    - Book 1
    - Book 2
    ...`;

    const response: any = await fetch(
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
          temperature: 0.85,
        }),
      }
    );

    const data: any = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const authorsByGenre: Map<string, string[]> = new Map();
    let currentGenre: string = genreCount === 1 ? favoriteGenres[0] : "";

    lines.forEach((line: string) => {
      if (line.startsWith("Genre:")) {
        currentGenre = line.replace("Genre:", "").trim();
        authorsByGenre.set(currentGenre, []);
      } else if (line.startsWith("-")) {
        const author = line.replace("-", "").trim();
        if (!authorsByGenre.has(currentGenre))
          authorsByGenre.set(currentGenre, []);
        authorsByGenre.get(currentGenre)!.push(author);
      }
    });

    const booksByGenre: Map<string, GoogleBooksItem[]> = new Map();
    const uniqueBooksMap: Map<string, GoogleBooksItem> = new Map();
    const finalBooks: GoogleBooksItem[] = [];

    for (const genre of favoriteGenres) {
      const authors = authorsByGenre.get(genre) || [];
      const authorBooks: GoogleBooksItem[] = (
        await Promise.all(
          authors.map(async (author: string) => {
            const res: any = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&printType=books&maxResults=40&orderBy=relevance`
            );
            const json: any = await res.json();
            return json.items || [];
          })
        )
      ).flat();

      // If not enough books from authors, get from genre keywords
      let genreBooks: GoogleBooksItem[] = authorBooks;
      const minBooks: number = genreCount === 1 ? 50 : genreCount * 50;

      if (authorBooks.length < minBooks / genreCount) {
        const keywordQuery = `bestseller ${genre} books in ${selectedCountry}`;
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keywordQuery)}&printType=books&maxResults=100&orderBy=relevance`
        );
        const json: any = await res.json();
        genreBooks = [...authorBooks, ...(json.items || [])];
      }

      const filtered: GoogleBooksItem[] = genreBooks.filter(
        (book: GoogleBooksItem) => {
          const id = book.id;
          if (!id || uniqueBooksMap.has(id)) return false;
          uniqueBooksMap.set(id, book);
          return true;
        }
      );

      booksByGenre.set(genre, filtered);
    }

    booksByGenre.forEach((books: GoogleBooksItem[]) =>
      finalBooks.push(...books)
    );
    finalBooks.filter((book: GoogleBooksItem) => {
      const id = book.id;
      if (!id || uniqueBooksMap.has(id)) return false;
      uniqueBooksMap.set(id, book);
      return true;
    });
    finalBooks.sort(() => Math.random() - 0.5);
    const booksPerGenre: number = 100;

    return finalBooks.slice(
      0,
      genreCount === 1 ? booksPerGenre : genreCount * booksPerGenre
    );
  }
}
