import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import OpenAI from "openai";
import ENV from "../config/env";
import { CacheService } from "./cacheService";
import { ApiError } from "../utils/apiUtils";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

const cacheService = CacheService.getInstance();

export class RecommendationError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "RecommendationError";
  }
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
    author: string
  ): Promise<any> {
    try {
      const query = encodeURIComponent(`${title} ${author}`);
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
      );
      const data = await response.json();

      if (data.items?.[0]) {
        return data.items[0];
      }
      return null;
    } catch (error) {
      console.error("Error searching book on Google Books:", error);
      return null;
    }
  }

  async getRecommendations(
    userId: string,
    skipCount: number = 0,
    count: number = 10
  ): Promise<any[]> {
    try {
      // firstly check the cache
      const cachedBooks = await cacheService.getRecommendedBooks(userId);
      if (cachedBooks && cachedBooks.length > 0 && skipCount === 0) {
        return cachedBooks;
      }

      // if cache is empty, check the firebase
      const userRef = doc(FIREBASE_DB, "Users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData) {
        throw new RecommendationError("User data not found");
      }

      const { favoriteGenres, favoriteBooks } = userData;

      // get the books in the user's library
      const libraryRef = doc(FIREBASE_DB, "Libraries", userId);
      const libraryDoc = await getDoc(libraryRef);
      const libraryData = libraryDoc.data();
      const userLibrary = libraryData?.books || [];

      // get the details of the books in the user's library
      const userLibraryDetails = await Promise.all(
        userLibrary.map(async (bookId: string) => {
          const bookRef = doc(FIREBASE_DB, "Books", bookId);
          const bookDoc = await getDoc(bookRef);
          return bookDoc.data();
        })
      );

      // join the details of the books in the user's library
      const bookDetails = userLibraryDetails
        .map((book) => {
          if (!book) return "";
          const details = `Title: ${book.title}\nAuthor: ${book.author}`;
          return book.description
            ? `${details}\nDescription: ${book.description}`
            : details;
        })
        .filter(Boolean)
        .join("\n\n");

      // create the prompt for ChatGPT
      const prompt = `Based on the following information, recommend exactly ${count} books that the user might enjoy (skip the first ${skipCount} recommendations):

User's Favorite Genres: ${favoriteGenres.join(", ")}
User's Favorite Books: ${favoriteBooks.join(", ")}

User's Current Library:
${bookDetails}

Guidelines:
1. Do not recommend any books that are already in the user's library
2. If a book has a description, use it to inform recommendations
3. Consider both the author's style and the book's content
4. Ensure recommendations are diverse and not too similar
5. Aim to expand the user's reading horizons while staying within their interests
6. Consider the user's favorite genres and books
7. Include a mix of popular and lesser-known books
8. Ensure recommendations are available on Google Books
9. Skip the first ${skipCount} recommendations and provide exactly ${count} books
10. Always return exactly ${count} books, no more and no less

Please provide a JSON array of exactly ${count} books in the following format:
[
  {
    "title": "Book Title",
    "author": "Author Name",
    "description": "Book Description",
    "genre": "Primary Genre"
  },
  ... (exactly ${count} books)
]`;

      // take recommendations from ChatGPT with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;

      while (retryCount <= maxRetries) {
        try {
          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openai.apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a book recommendation expert. You must provide exactly the requested number of book recommendations in the specified JSON format. Do not include any additional text or explanations in your response, only the JSON array.",
                  },
                  { role: "user", content: prompt },
                ],
                temperature: 0.7,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("GPT API Error:", errorData);

            // Check if it's a quota exceeded error
            if (errorData.error?.message?.includes("quota")) {
              throw new RecommendationError(
                "We've reached our daily limit for book recommendations. Please try again tomorrow."
              );
            }

            throw new RecommendationError(
              `Failed to get recommendations from GPT: ${
                errorData.error?.message || "Unknown error"
              }`
            );
          }

          const data = await response.json();
          if (!data.choices?.[0]?.message?.content) {
            throw new RecommendationError("Invalid response format from GPT");
          }

          let recommendations;
          try {
            recommendations = JSON.parse(data.choices[0].message.content);
            // Validate the recommendations format
            if (
              !Array.isArray(recommendations) ||
              recommendations.length === 0
            ) {
              throw new Error("Invalid recommendations format");
            }
            // Check if each recommendation has required fields
            recommendations.forEach((book) => {
              if (!book.title || !book.author) {
                throw new Error("Missing required fields in recommendations");
              }
            });

            // for each recommended book, get the detailed information from Google Books
            const recommendedBooks = await Promise.all(
              recommendations.map(async (book: any) => {
                const googleBook = await this.searchBookOnGoogleBooks(
                  book.title,
                  book.author
                );
                if (googleBook) {
                  return {
                    ...googleBook,
                    id:
                      googleBook.id ||
                      `${book.title}_${book.author}`.replace(
                        /[^a-zA-Z0-9]/g,
                        "_"
                      ),
                  };
                }
                return null;
              })
            );

            // filter out null values and get unique books
            const uniqueBooks = recommendedBooks
              .filter((book): book is any => book !== null)
              .filter(
                (book, index, self) =>
                  index === self.findIndex((b) => b.id === book.id)
              );

            // save the recommendations to firebase
            const recommendationsRef = doc(
              FIREBASE_DB,
              "Recommendations",
              userId
            );

            // Get existing recommendations first
            const existingDoc = await getDoc(recommendationsRef);
            const existingBooks = existingDoc.exists()
              ? existingDoc.data().books || []
              : [];

            // Merge existing books with new books and remove duplicates
            const allBooks = [...existingBooks, ...uniqueBooks];
            const mergedBooks = allBooks.filter(
              (book, index, self) =>
                index === self.findIndex((b) => b.id === book.id)
            );

            // Save merged books to firebase
            await setDoc(recommendationsRef, {
              books: mergedBooks,
              timestamp: new Date().toISOString(),
            });

            // save the recommendations to cache
            await cacheService.saveRecommendedBooks(userId, mergedBooks);

            return uniqueBooks;
          } catch (parseError) {
            console.error(`Parse attempt failed:`, parseError);
            throw new RecommendationError(
              "We're having trouble processing the book recommendations. Please try again in a few minutes."
            );
          }
        } catch (error) {
          lastError = error;
          console.error(`Network attempt ${retryCount + 1} failed:`, error);

          if (retryCount === maxRetries) {
            if (
              error instanceof TypeError &&
              error.message === "Network request failed"
            ) {
              throw new RecommendationError(
                "Please check your internet connection and try again."
              );
            }
            throw error;
          }

          retryCount++;
          // No waiting time between retries
        }
      }

      throw lastError;
    } catch (error) {
      console.error("Error getting recommendations:", error);
      if (error instanceof RecommendationError) {
        throw error;
      }
      throw new RecommendationError(
        "Failed to get recommendations",
        undefined,
        error
      );
    }
  }
}
