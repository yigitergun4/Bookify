import axios from "axios";
import { withRetry, ApiError } from "../utils/apiUtils";
import ENV from "../config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { getCountryCode, getLanguageCode } from "@/utils/countryUtils";

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

// It's not necessary to use yet but it's here for future reference
// export const searchBook: (
//   title: string,
//   author: string
// ) => Promise<any> = async (title: string, author: string): Promise<any> => {
//   const BOOKS_API_KEY = process.env.EXPO_PUBLIC_BOOKS_API_KEY;
//   try {
//     const result = await withRetry(async () => {
//       let query: string = "";
//       const MAX_RESULTS: number = 10;
//       if (title && title.trim()) {
//         query += encodeURIComponent(title.trim());
//       }
//       if (author && author !== "Unknown" && author.trim()) {
//         if (query) query += "+";
//         query += encodeURIComponent(author.trim());
//       }
//       let url: string = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}&printType=books&orderBy=relevance&key=${BOOKS_API_KEY}`;
//       console.log("SearchBook URL:", url);
//       const response: any = await axios.get(url);
//       const items: GoogleBooksItem[] = response.data.items || [];
//       if (items.length === 0) {
//         throw new BooksError("No book found for the given query");
//       }
//       // the most relevant book
//       const bookData: GoogleBooksItem = items[0];
//       if (!bookData || !bookData.volumeInfo || !bookData.volumeInfo.title) {
//         throw new BooksError("Invalid book data received from API");
//       }
//       return bookData;
//     });
//     return result;
//   } catch (error) {
//     if (error instanceof BooksError) {
//       throw error;
//     }
//     throw new BooksError("Failed to search for book", undefined, error);
//   }
// };

export const searchBooksPaginated: (
  query: string,
  startIndex: number,
  country?: string
) => Promise<any> = async (
  query: string,
  startIndex: number = 0,
  country: string = "Turkey"
): Promise<any> => {
  const countryCode = getCountryCode(country);
  const languageCode = getLanguageCode(country);

  const url: string = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&startIndex=${startIndex}&country=${countryCode}&langRestrict=${languageCode}`;

  const response: any = await fetch(url);
  const data: any = await response.json();
  return data;
};

export const searchBookList: (
  title: string,
  author: string,
  language: string,
  country?: string
) => Promise<any[]> = async (
  title: string,
  author: string,
  language: string,
  country: string = "Turkey"
): Promise<any[]> => {
  const BOOKS_API_KEY = process.env.EXPO_PUBLIC_BOOKS_API_KEY;
  const countryCode: string = getCountryCode(country);
  const languageCode: string = getLanguageCode(country);

  const MAX_RESULTS_PER_QUERY: number = 20;
  const results: any[] = [];

  try {
    // First search: By title (20 results)
    if (title && title !== "Unknown") {
      const titleQuery = encodeURIComponent(title);
      let titleUrl = `https://www.googleapis.com/books/v1/volumes?q=${titleQuery}&maxResults=${MAX_RESULTS_PER_QUERY}&country=${countryCode}&langRestrict=${languageCode}`;

      titleUrl += `&key=${BOOKS_API_KEY}`;

      console.log("Title search URL:", titleUrl);

      const titleResponse: any = await axios.get(titleUrl);
      const titleItems: GoogleBooksItem[] = titleResponse.data.items || [];
      console.log("Title search results count:", titleItems.length);

      results.push(...titleItems);
    }

    // Second search: By author (20 results)
    if (author && author !== "Unknown") {
      const authorQuery: string = "inauthor:" + encodeURIComponent(author);
      let authorUrl: string = `https://www.googleapis.com/books/v1/volumes?q=${authorQuery}&maxResults=${MAX_RESULTS_PER_QUERY}&country=${countryCode}&langRestrict=${languageCode}`;

      authorUrl += `&key=${BOOKS_API_KEY}`;

      console.log("Author search URL:", authorUrl);

      const authorResponse: any = await axios.get(authorUrl);
      const authorItems: GoogleBooksItem[] = authorResponse.data.items || [];
      console.log("Author search results count:", authorItems.length);

      results.push(...authorItems);
    }

    // Remove duplicates based on book ID
    const uniqueResults: GoogleBooksItem[] = results.filter(
      (book, index, self) => index === self.findIndex((b) => b.id === book.id)
    );

    const mixBooks: GoogleBooksItem[] = [...uniqueResults];
    mixBooks.sort(() => Math.random() - 0.5);

    console.log("Total unique results count:", mixBooks.length);

    return mixBooks;
  } catch (error) {
    console.error("Error searching books:", error);
    return [];
  }
};

export const searchBooksSequential: (
  title: string,
  author: string,
  country?: string
) => Promise<GoogleBooksItem[]> = async (
  title: string,
  author: string,
  country: string = "Turkey"
): Promise<GoogleBooksItem[]> => {
  const BOOKS_API_KEY = process.env.EXPO_PUBLIC_BOOKS_API_KEY;
  const countryCode = getCountryCode(country);
  const languageCode = getLanguageCode(country);

  try {
    const result = await withRetry(async () => {
      let query: string = "";
      const MAX_RESULTS: number = 10;

      if (title && title.trim()) {
        query += encodeURIComponent(title.trim());
      }

      if (author && author !== "Unknown" && author.trim()) {
        if (query) query += "+";
        query += encodeURIComponent(author.trim());
      }
      let url: string = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=${MAX_RESULTS}&printType=books&orderBy=relevance&country=${countryCode}&langRestrict=${languageCode}&key=${BOOKS_API_KEY}`;
      console.log("SearchBooksSequential URL:", url);

      const response: any = await axios.get(url);
      const items: GoogleBooksItem[] = response.data.items || [];

      if (items.length === 0) {
        throw new BooksError("No books found for the given query");
      }
      console.log(`Found ${items.length} books for sequential checking`);
      return items;
    });
    return result;
  } catch (error) {
    if (error instanceof BooksError) {
      throw error;
    }
    throw new BooksError("Failed to search for books", undefined, error);
  }
};

// New function for search results with pagination
export const searchBooksForResults: (
  query: string,
  startIndex: number,
  maxResults: number,
  country?: string
) => Promise<{
  items: GoogleBooksItem[];
  totalItems: number;
}> = async (
  query: string,
  startIndex: number = 0,
  maxResults: number = 10,
  country: string = "Turkey"
): Promise<{
  items: GoogleBooksItem[];
  totalItems: number;
}> => {
  const countryCode = getCountryCode(country);
  const languageCode = getLanguageCode(country);

  try {
    const url: string = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&startIndex=${startIndex}&maxResults=${maxResults}&country=${countryCode}&langRestrict=${languageCode}`;

    console.log("SearchBooksForResults URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new BooksError(
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    const data: any = await response.json();

    return {
      items: data.items || [],
      totalItems: data.totalItems || 0,
    };
  } catch (error) {
    if (error instanceof BooksError) {
      throw error;
    }
    throw new BooksError("Failed to search for books", undefined, error);
  }
};
