import { FIREBASE_DB } from "@/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import OpenAI from "openai";
import ENV from "../config/env";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

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

  async getRecommendations(userId: string): Promise<any[]> {
    try {
      console.log("Loading recommendations...");
      const userRef = doc(FIREBASE_DB, "Users", userId);
      const userDoc = await getDoc(userRef);
      const userBooks = userDoc.data()?.libraryBooks || [];

      let prompt;
      if (userBooks.length === 0) {
        prompt = `Recommend 20 of the most popular and highly-rated books across different genres.
        Important guidelines:
        1. Include a mix of classic and contemporary books
        2. Consider books that have won major literary awards
        3. Include books that have been bestsellers
        4. Ensure recommendations are diverse in terms of genres and authors
        5. Focus on books that have received critical acclaim and high ratings

        For each book, provide ONLY the title and author in this format:
        [{
          "title": "book title",
          "author": "author name"
        }]`;
      } else {
        const bookDetails = userBooks
          .map((book: any) => {
            const baseInfo = `${book.volumeInfo.title} by ${
              book.volumeInfo.authors?.[0] || "Unknown"
            }`;
            const description = book.volumeInfo.description
              ? `\nDescription: ${book.volumeInfo.description}`
              : "";
            return baseInfo + description;
          })
          .join("\n\n");

        prompt = `Based on these books in the user's library: 
        ${bookDetails}

        Recommend 20 books that would complement their reading taste.
        Important guidelines:
        1. DO NOT recommend any books that are already in the user's library
        2. If a book has a description, pay special attention to the themes, writing style, and subject matter
        3. Consider both the author's style and the book's content
        4. Ensure recommendations are diverse and not too similar to each other
        5. Focus on books that would expand the user's reading horizons while staying within their interests

        For each book, provide ONLY the title and author in this format:
        [{
          "title": "book title",
          "author": "author name"
        }]`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a book recommendation expert. Return ONLY a valid JSON array of 20 books with title and author, with no additional text or explanation.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0].message?.content;
      if (!response) {
        throw new Error("No response from GPT");
      }

      try {
        const cleanedResponse = response
          .trim()
          .replace(/^```json\n?|\n?```$/g, "")
          .replace(/^\[|\]$/g, "")
          .trim();

        const jsonStr = `[${cleanedResponse}]`;
        const recommendations = JSON.parse(jsonStr);

        if (!Array.isArray(recommendations)) {
          throw new Error("Response is not an array");
        }

        // Her önerilen kitap için Google Books API'den gerçek veriyi al
        const booksWithDetails = await Promise.all(
          recommendations.map(async (book: any) => {
            try {
              if (!book?.title || !book?.author) {
                console.log(
                  "Skipping book with missing title or author:",
                  book
                );
                return null;
              }

              const bookData = await this.searchBookOnGoogleBooks(
                book.title,
                book.author
              );

              if (!bookData) {
                console.log("No data found for book:", book.title);
                return null;
              }

              // Eğer ID yoksa veya boşsa, title ve author'dan benzersiz bir ID oluştur
              if (!bookData.id) {
                bookData.id = `${book.title}_${book.author}`.replace(
                  /[^a-zA-Z0-9]/g,
                  "_"
                );
              }

              // Gerekli alanların varlığını kontrol et
              if (!bookData.volumeInfo) {
                bookData.volumeInfo = {
                  title: book.title,
                  authors: [book.author],
                  description: "No description available",
                  imageLinks: {},
                  publisher: "Unknown",
                  language: "Unknown",
                };
              }

              return bookData;
            } catch (error) {
              console.error("Error processing book:", book.title, error);
              return null;
            }
          })
        );

        // Null olmayan ve benzersiz ID'ye sahip sonuçları filtrele
        const uniqueBooks = booksWithDetails.filter(
          (book): book is NonNullable<typeof book> =>
            book !== null &&
            book.id !== undefined &&
            book.volumeInfo !== undefined
        );

        if (uniqueBooks.length === 0) {
          console.log("No valid books found after processing");
          return [];
        }

        console.log("Recommendations loaded successfully!");
        return uniqueBooks;
      } catch (parseError) {
        console.error("Error parsing GPT response:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error getting recommendations:", error);
      throw error;
    }
  }
}
