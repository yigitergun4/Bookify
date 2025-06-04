import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
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

  private async searchBookOnGoogleBooks(
    title: string,
    author: string,
    userGenres: Set<string>
  ): Promise<any> {
    try {
      // Clean and normalize the input
      const cleanTitle = title.toLowerCase().trim();
      const cleanAuthor = author.toLowerCase().trim();

      // Try different search strategies
      const searchStrategies = [
        // Strategy 1: Exact match with title and author
        `intitle:"${cleanTitle}" inauthor:"${cleanAuthor}"`,
        // Strategy 2: Title with quotes and author without quotes
        `intitle:"${cleanTitle}" ${cleanAuthor}`,
        // Strategy 3: Title without quotes and author with quotes
        `${cleanTitle} inauthor:"${cleanAuthor}"`,
        // Strategy 4: Title and author without quotes
        `${cleanTitle} ${cleanAuthor}`,
      ];

      let bestMatch = null;
      let highestSimilarity = 0;

      for (const query of searchStrategies) {
        try {
          console.log("[RecommendationService] Trying search strategy:", query);
          const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
              query
            )}&maxResults=10&printType=books`
          );
          const data = await response.json();

          if (data.items && data.items.length > 0) {
            console.log(
              "[RecommendationService] Found",
              data.items.length,
              "results for query:",
              query
            );

            // Check each result
            for (const item of data.items) {
              const itemTitle = item.volumeInfo.title.toLowerCase();
              const itemAuthors =
                item.volumeInfo.authors?.map((a: string) => a.toLowerCase()) ||
                [];

              // Calculate similarities
              const titleSimilarity = this.calculateSimilarity(
                itemTitle,
                cleanTitle
              );
              const authorSimilarity = Math.max(
                ...itemAuthors.map((a: string) =>
                  this.calculateSimilarity(a, cleanAuthor)
                )
              );

              // Log potential matches
              if (titleSimilarity > 0.5 || authorSimilarity > 0.5) {
                console.log("[RecommendationService] Potential match:", {
                  title: item.volumeInfo.title,
                  authors: item.volumeInfo.authors,
                  similarities: {
                    title: titleSimilarity,
                    author: authorSimilarity,
                  },
                });
              }

              // Update best match if this is better
              const combinedSimilarity =
                0.3 * titleSimilarity + 0.7 * authorSimilarity;

              if (combinedSimilarity > highestSimilarity) {
                highestSimilarity = combinedSimilarity;
                bestMatch = item;
              }
            }
          } else {
            console.log(
              "[RecommendationService] No results found for query:",
              query
            );
          }
        } catch (error) {
          console.error(
            "[RecommendationService] Error in search strategy:",
            query,
            error
          );
          continue;
        }
      }

      // If we found a match with reasonable similarity
      if (bestMatch && highestSimilarity > 0.5) {
        console.log("[RecommendationService] Found best match:", {
          title: bestMatch.volumeInfo.title,
          authors: bestMatch.volumeInfo.authors,
          similarity: highestSimilarity,
        });
        return bestMatch;
      }

      console.log("[RecommendationService] No suitable match found for:", {
        title,
        author,
        highestSimilarity,
      });
      return null;
    } catch (error) {
      console.error("[RecommendationService] Error searching book:", error);
      return null;
    }
  }

  // Helper function to calculate string similarity
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // If strings are identical
    if (s1 === s2) return 1.0;

    // If one string is empty
    if (!s1 || !s2) return 0.0;

    // Calculate Levenshtein distance
    const matrix = Array(s1.length + 1)
      .fill(null)
      .map(() => Array(s2.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - distance / maxLength;
  }

  async getRecommendations(
    userId: string,
    page: number = 0
  ): Promise<GoogleBooksItem[]> {
    try {
      // Get metadata first
      const metadataRef = doc(
        FIREBASE_DB,
        "Recommendations",
        `${userId}_metadata`
      );
      const metadataSnap = await getDoc(metadataRef);

      if (!metadataSnap.exists()) {
        return [];
      }

      const metadata = metadataSnap.data();
      if (page >= metadata.totalPages) {
        return [];
      }

      // Get the requested page
      const recommendationsRef = doc(
        FIREBASE_DB,
        "Recommendations",
        `${userId}_${page}`
      );
      const recommendationsSnap = await getDoc(recommendationsRef);

      if (!recommendationsSnap.exists()) {
        return [];
      }

      return recommendationsSnap.data().books || [];
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
          ? "Focus on classic literature, timeless masterpieces, and influential works that have stood the test of time. Include historical context and literary significance in your queries."
          : userGoal?.id === "contemporary"
            ? "Focus on modern bestsellers, trending books, and contemporary literature. Include recent publications and popular authors in your queries."
            : userGoal?.id === "genres"
              ? "Focus on diverse genres and styles. Create queries that explore different literary styles and cross-genre works. Include a mix of popular and niche genres."
              : userGoal?.id === "authors"
                ? "Focus on authors similar to the user's favorites. Create queries that explore writing styles, themes, and literary movements associated with their preferred authors."
                : "Create diverse queries that combine book titles, key themes, genres, or authors the user might enjoy."
      }
      
      Each query should intelligently combine book titles, key themes, genres, or authors the user might enjoy. Avoid repeating already read or favorited book titles directly. Instead, infer related topics or similar content.
      
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
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
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
      console.error("Error getting ChatGPT recommendations:", error);
      // Return fallback queries if ChatGPT fails
      return [
        `subject:${favoriteGenres[0] || "fiction"}`,
        `inauthor:"${favoriteBooks[0]?.volumeInfo?.authors?.[0] || "Stephen King"}"`,
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
      // Get metadata to know how many pages to delete
      const metadataRef = doc(
        FIREBASE_DB,
        "Recommendations",
        `${userId}_metadata`
      );
      const metadataSnap = await getDoc(metadataRef);

      if (metadataSnap.exists()) {
        const metadata = metadataSnap.data();
        // Delete all pages
        for (let i = 0; i < metadata.totalPages; i++) {
          const pageRef = doc(FIREBASE_DB, "Recommendations", `${userId}_${i}`);
          await setDoc(pageRef, { books: [] });
        }
      }

      // Delete metadata
      await setDoc(metadataRef, {
        totalBooks: 0,
        totalPages: 0,
        lastUpdated: new Date().toISOString(),
      });

      // Clear recommendation cache
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
      // Split books into chunks of 20 to stay under Firebase size limit
      const CHUNK_SIZE = 20;
      const chunks = [];
      for (let i = 0; i < books.length; i += CHUNK_SIZE) {
        chunks.push(books.slice(i, i + CHUNK_SIZE));
      }

      // Save each chunk as a separate document
      for (let i = 0; i < chunks.length; i++) {
        const recommendationsRef = doc(
          FIREBASE_DB,
          "Recommendations",
          `${userId}_${i}`
        );
        await setDoc(recommendationsRef, {
          books: chunks[i],
          timestamp: new Date().toISOString(),
          page: i,
          totalPages: chunks.length,
        });
      }

      // Save metadata about the recommendations
      const metadataRef = doc(
        FIREBASE_DB,
        "Recommendations",
        `${userId}_metadata`
      );
      await setDoc(metadataRef, {
        totalBooks: books.length,
        totalPages: chunks.length,
        lastUpdated: new Date().toISOString(),
      });

      console.log(
        `[RecommendationService] Saved ${books.length} books in ${chunks.length} pages`
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
