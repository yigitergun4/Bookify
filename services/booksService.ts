import axios from "axios";

const BOOKS_API_KEY = "AIzaSyALRYFWbp8BkrD7ONPPH5TmJ4_oZEUR1yM";

export interface BookData {
  title: string;
  authors: string[];
  description: string;
  imageLinks?: {
    thumbnail: string;
  };
}

export const searchBook = async (query: string): Promise<BookData> => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&key=${BOOKS_API_KEY}`
    );

    return (
      response.data.items?.[0]?.volumeInfo || {
        title: "",
        authors: [],
        description: "",
        imageLinks: { thumbnail: "" },
      }
    );
  } catch (error) {
    console.error("Books API Error:", error);
    throw error;
  }
};
