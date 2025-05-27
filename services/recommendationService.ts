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
    skipCount: number = 0
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

      // Kullanıcının kütüphanesindeki kitapları al
      const libraryRef = doc(FIREBASE_DB, "Libraries", userId);
      const libraryDoc = await getDoc(libraryRef);
      const libraryData = libraryDoc.data();
      const userLibrary = libraryData?.books || [];

      // Kullanıcının kütüphanesindeki kitapların detaylarını al
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
      const prompt = `Based on the following information, recommend 20 books that the user might enjoy (skip the first ${skipCount} recommendations):

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
9. Skip the first ${skipCount} recommendations and provide the next 20 books

Please provide a JSON array of 20 books, each with the following format:
{
  "title": "Book Title",
  "author": "Author Name",
  "description": "Book Description",
  "genre": "Primary Genre"
}`;

      // ChatGPT'den önerileri al
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openai.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "You are a book recommendation expert. Provide recommendations in the exact JSON format specified.",
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
      } catch (parseError) {
        console.error(
          "Failed to parse GPT response:",
          data.choices[0].message.content
        );
        throw new RecommendationError("Failed to parse GPT response");
      }

      // Her bir önerilen kitap için Google Books'tan detaylı bilgileri al
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
                `${book.title}_${book.author}`.replace(/[^a-zA-Z0-9]/g, "_"),
            };
          }
          return null;
        })
      );

      // Null değerleri filtrele ve benzersiz kitapları al
      const uniqueBooks = recommendedBooks
        .filter((book): book is any => book !== null)
        .filter(
          (book, index, self) =>
            index === self.findIndex((b) => b.id === book.id)
        );

      // Önerileri Firebase'e kaydet
      const recommendationsRef = doc(FIREBASE_DB, "Recommendations", userId);
      await setDoc(recommendationsRef, {
        books: uniqueBooks,
        timestamp: new Date().toISOString(),
      });

      // Önerileri cache'e kaydet
      await cacheService.saveRecommendedBooks(userId, uniqueBooks);

      return uniqueBooks;
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
