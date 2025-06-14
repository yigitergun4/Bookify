import axios from "axios";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";

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

export const searchBook: (
  title: string,
  author: string
) => Promise<any> = async (title: string, author: string): Promise<any> => {
  const BOOKS_API_KEY = ENV.BOOKS_API_KEY;
  try {
    const result = await withRetry(async () => {
      let query: string = "";
      const MAX_RESULTS: number = 10;

      if (title) {
        query += `intitle:${encodeURIComponent(title)}`;
      }

      if (author && author !== "Unknown") {
        query += `+inauthor:${encodeURIComponent(author)}`;
      }

      let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}&printType=books&orderBy=relevance&key=${BOOKS_API_KEY}`;

      const response: any = await axios.get(url);
      const items: GoogleBooksItem[] = response.data.items || [];

      if (items.length === 0) {
        throw new BooksError("No book found for the given query");
      }

      // the most relevant book
      const bookData: GoogleBooksItem = items[0];

      if (!bookData || !bookData.volumeInfo || !bookData.volumeInfo.title) {
        throw new BooksError("Invalid book data received from API");
      }

      return bookData;
    });
    return result;
  } catch (error) {
    if (error instanceof BooksError) {
      throw error;
    }
    throw new BooksError("Failed to search for book", undefined, error);
  }
};

export const searchBooksPaginated: (
  query: string,
  startIndex: number
) => Promise<any> = async (
  query: string,
  startIndex: number = 0
): Promise<any> => {
  const url: string = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&startIndex=${startIndex}`;
  const response: any = await fetch(url);
  const data: any = await response.json();
  return data;
};

export const searchBookList: (
  title: string,
  author: string,
  language: string
) => Promise<any[]> = async (
  title: string,
  author: string,
  language: string
): Promise<any[]> => {
  const BOOKS_API_KEY = ENV.BOOKS_API_KEY;
  console.log("Search parameters:", { title, author, language });
  const MAX_RESULTS: number = 40;
  let query: string = encodeURIComponent(title);
  if (author && author !== "Unknown") {
    query += "+inauthor:" + encodeURIComponent(author);
  }
  let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}`;
  if (language && language !== "Unknown") {
    url += `&langRestrict=${encodeURIComponent(language)}`;
  }
  url += `&key=${BOOKS_API_KEY}`;

  console.log("Search URL:", url);

  const response: any = await axios.get(url);
  const items: GoogleBooksItem[] = response.data.items || [];
  console.log("Search results count:", items.length);
  return items;
};
