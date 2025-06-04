import { FIREBASE_DB } from "@/FirebaseConfig";
import { collection, getDocs, deleteDoc, addDoc } from "firebase/firestore";
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

  async getRecommendations(userId: string): Promise<GoogleBooksItem[]> {
    try {
      // First try to get from cache
      const cachedBooks = await cacheService.getRecommendedBooks(userId);
      if (cachedBooks && cachedBooks.length > 0) {
        return cachedBooks;
      }

      // If not in cache, get from Firebase subcollection
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const recommendationsSnap = await getDocs(recommendationsRef);

      if (recommendationsSnap.empty) {
        return [];
      }

      // Combine all chunks and sort by chunkIndex
      const allBooks = recommendationsSnap.docs
        .map((doc) => doc.data().books)
        .flat()
        .sort((a, b) => a.chunkIndex - b.chunkIndex);

      // Save to cache for next time
      await cacheService.saveRecommendedBooks(userId, allBooks);

      return allBooks;
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
      console.log(userGoal?.id, "userGoal?.id, : recommendationService:105");
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
        const errorData = await response.json();
        throw new Error(
          `ChatGPT API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const data = await response.json();
      console.log(
        data.choices?.[0]?.message?.content,
        "data, : recommendationService:226"
      );
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
      // Return fallback queries if ChatGPT fails
      return [
        `subject:${favoriteGenres[0] || "fiction"}`,
        `inauthor:"${favoriteBooks[0]?.volumeInfo?.authors?.[0] || "J.K. Rowling"}"`,
        `intitle:"${favoriteBooks[0]?.volumeInfo?.title || "The"}"`,
      ];
    }
  }

  async searchBooksWithQuery(query: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=40&orderBy=relevance`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Error searching books:", error);
      throw error;
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
      console.error(
        "[RecommendationService] Error deleting recommendations:",
        error
      );
      throw error;
    }
  }

  private async getBooksFromGoogleBooks(
    favoriteGenres: string[],
    favoriteBooks: string[]
  ): Promise<any[]> {
    try {
      let allBooks: any[] = [];

      // Search by genres
      for (const genre of favoriteGenres) {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
            genre
          )}&maxResults=20&langRestrict=en,tr&orderBy=relevance`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.items) {
            allBooks = [...allBooks, ...data.items];
          }
        }
      }

      // Search by favorite books to get similar books
      for (const book of favoriteBooks) {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
            book
          )}&maxResults=20&langRestrict=en,tr&orderBy=relevance`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.items) {
            allBooks = [...allBooks, ...data.items];
          }
        }
      }

      // Remove duplicates and filter out books without required fields
      const uniqueBooks = Array.from(
        new Map(
          allBooks
            .filter(
              (book) =>
                book.id &&
                book.volumeInfo?.title &&
                book.volumeInfo?.authors &&
                book.volumeInfo?.imageLinks?.thumbnail
            )
            .map((book) => [book.id, book])
        ).values()
      );

      // Shuffle the array to get random recommendations
      const shuffledBooks = uniqueBooks.sort(() => Math.random() - 0.5);

      return shuffledBooks;
    } catch (error) {
      console.error(
        "[RecommendationService] Error fetching books from Google Books:",
        error
      );
      return [];
    }
  }

  async saveRecommendations(
    userId: string,
    books: GoogleBooksItem[]
  ): Promise<void> {
    try {
      // Split books into chunks of 100
      const CHUNK_SIZE = 100;
      const chunks: GoogleBooksItem[][] = [];
      for (let i = 0; i < books.length; i += CHUNK_SIZE) {
        chunks.push(books.slice(i, i + CHUNK_SIZE));
      }

      // Save each chunk as a separate document in the subcollection
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );

      // Save new recommendations
      const savePromises = chunks.map((chunk) =>
        addDoc(recommendationsRef, {
          books: chunk,
          createdAt: new Date().toISOString(),
          chunkIndex: chunks.indexOf(chunk),
        })
      );
      await Promise.all(savePromises);

      // Save to cache
      await cacheService.saveRecommendedBooks(userId, books);

      console.log(
        `[RecommendationService] Saved ${books.length} books in ${chunks.length} chunks`
      );
    } catch (error) {
      console.error(
        "[RecommendationService] Error saving recommendations:",
        error
      );
      throw error;
    }
  }
}
