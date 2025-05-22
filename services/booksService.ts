import axios from "axios";
import { CacheService } from "./cacheService";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";

const cacheService = CacheService.getInstance();

export interface BookData {
  title: string;
  authors: string[];
  description: string;
  imageLinks?: {
    thumbnail: string;
  };
}

export class BooksError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "BooksError";
  }
}

export const searchBook = async (
  title: string,
  author: string,
  language: string
): Promise<any> => {
  const BOOKS_API_KEY = ENV.BOOKS_API_KEY;

  try {
    //const cacheKey = `books_${title}_${author}_${language}`;
    //const cachedResult = await cacheService.get<BookData>(cacheKey);
    //if (cachedResult) {
    //  console.log(cachedResult, "cachedResult booksService:35");
    //  return cachedResult;
    //}

    const result = await withRetry(async () => {
      let query = encodeURIComponent(title);
      if (author && author !== "Unknown Author") {
        query += "+inauthor:" + encodeURIComponent(author);
      }
      let url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
      if (language && language !== "und") {
        url += `&langRestrict=${encodeURIComponent(language)}`;
      }
      url += `&fields=items(id,volumeInfo,accessInfo,saleInfo)&key=${BOOKS_API_KEY}`;

      console.log("[BooksService] Searching with URL:", url);
      const response = await axios.get(url);
      const items = response.data.items || [];
      console.log(
        "[BooksService] Found items:",
        items.map((item: any) => item)
      );

      if (items.length === 0) {
        throw new BooksError("No book found for the given query");
      }

      const bookData = items[0];
      console.log("[BooksService] Selected book data:", bookData);

      if (!bookData || !bookData.volumeInfo || !bookData.volumeInfo.title) {
        throw new BooksError("Invalid book data received from API");
      }

      return bookData;
    });

    // Cache the result
    // await cacheService.set(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof BooksError) {
      throw error;
    }
    throw new BooksError("Failed to search for book", undefined, error);
  }
};
