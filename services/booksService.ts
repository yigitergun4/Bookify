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

export const searchBook = async (query: string): Promise<BookData> => {
  const BOOKS_API_KEY = ENV.BOOKS_API_KEY;

  try {
    // Generate cache key from query
    const cacheKey = `books_${query}`;

    // Check cache first
    const cachedResult = await cacheService.get<BookData>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // If not in cache, make API call with retry
    const result = await withRetry(async () => {
      const response = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&key=${BOOKS_API_KEY}`
      );

      const bookData = response.data.items?.[0]?.volumeInfo;
      if (!bookData) {
        throw new BooksError("No book found for the given query");
      }

      return {
        title: bookData.title || "",
        authors: bookData.authors || [],
        description: bookData.description || "",
        imageLinks: bookData.imageLinks || { thumbnail: "" },
      };
    });

    // Cache the result
    await cacheService.set(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof BooksError) {
      throw error;
    }
    throw new BooksError("Failed to search for book", undefined, error);
  }
};
