import axios from "axios";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";

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
    const result = await withRetry(async () => {
      let query = "";
      const MAX_RESULTS: number = 10;

      if (title) {
        query += `intitle:${encodeURIComponent(title)}`;
      }

      if (author && author !== "Unknown") {
        query += `+inauthor:${encodeURIComponent(author)}`;
      }

      let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}&printType=books&orderBy=relevance&key=${BOOKS_API_KEY}`;

      if (language && language !== "Unknown") {
        url += `&langRestrict=${encodeURIComponent(language)}`;
      }

      const response = await axios.get(url);
      const items = response.data.items || [];

      if (items.length === 0) {
        throw new BooksError("No book found for the given query");
      }

      // the most relevant book
      const bookData = items[0];

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

export const searchBooksPaginated = async (
  query: string,
  startIndex: number = 0
) => {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&startIndex=${startIndex}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
};

export const searchBookList = async (
  title: string,
  author: string,
  language: string
): Promise<any[]> => {
  const BOOKS_API_KEY = ENV.BOOKS_API_KEY;
  console.log("Search parameters:", { title, author, language });

  let query = encodeURIComponent(title);
  if (author && author !== "Unknown") {
    query += "+inauthor:" + encodeURIComponent(author);
  }
  let url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
  if (language && language !== "Unknown") {
    url += `&langRestrict=${encodeURIComponent(language)}`;
  }
  url += `&fields=items(id,volumeInfo,accessInfo,saleInfo)&key=${BOOKS_API_KEY}`;

  console.log("Search URL:", url);

  const response = await axios.get(url);
  const items = response.data.items || [];
  console.log("Search results count:", items.length);
  return items;
};
