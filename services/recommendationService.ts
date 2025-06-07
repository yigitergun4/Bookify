import { FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { CacheService } from "./cacheService";
import { ApiError } from "../utils/apiUtils";
import ENV from "@/config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";

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
  searchStrategy: string | ((genres: string[]) => string);
  categories: string[] | ((genres: string[]) => string[]);
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

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private mixBooksFromQueries(results: any[][]): any[] {
    const mixedBooks: any[] = [];
    const seenIds: Set<string> = new Set<string>();

    // First, flatten all results into a single array
    const allBooks: GoogleBooksItem[] = results.flat();

    // Then add books one by one, ensuring no duplicates
    for (const book of allBooks) {
      if (book && !seenIds.has(book.id)) {
        mixedBooks.push(book);
        seenIds.add(book.id);
      }
    }

    return mixedBooks;
  }

  async searchBooksWithQuery(query: string): Promise<any[]> {
    const orderBy: string = "relevance";
    const maxPerPage: number = 40;
    try {
      console.log("[RecommendationService] Searching with query:", query);
      const response: any = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=${maxPerPage}&orderBy=${orderBy}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch books");
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.log("[RecommendationService] Error searching books:", error);
      throw error;
    }
  }

  async getPersonalizedRecommendations(
    userId: string,
    userPreferences?: {
      favoriteGenres?: string[];
      favoriteBooks?: any[];
      readBooks?: any[];
      libraryBooks?: any[];
      userGoal?: any[];
    }
  ): Promise<any[]> {
    console.log("[getPersonalizedRecommendations] Called with:", {
      userId,
      hasUserPreferences: !!userPreferences,
      preferences: userPreferences,
    });
    try {
      // If user preferences are provided, use them directly
      if (userPreferences) {
        const {
          favoriteGenres = [] as string[],
          favoriteBooks = [] as GoogleBooksItem[],
          readBooks = [] as GoogleBooksItem[],
          libraryBooks = [] as GoogleBooksItem[],
          userGoal = [] as UserGoal[],
        } = userPreferences;

        // Create multiple search queries
        const prompt: string = `You are a book recommendation assistant generating search queries for the Google Books API.

User Preferences:
- Favorite Genres: ${favoriteGenres.join(", ")}
- Favorite Books: ${favoriteBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- Books already read: ${readBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
- User's reading goals: ${userGoal?.map((goal: any) => goal.title).join(", ")}
- User's library: ${libraryBooks.map((book: any) => book.volumeInfo?.title).join(", ")}

Instructions:
1. Generate 5 diverse and creative search queries.
2. Do NOT use the exact titles listed in favoriteBooks or user's library.
3. Instead, identify patterns such as genres, themes, historical periods, writing styles, or author types from those books and base queries on that.
4. Include a mix of genre-based, author-inspired, and theme-driven queries. Use rich, specific keywords.
5. Promote discovery. Suggest queries that might expand the user's interests without straying too far.
6. Do NOT use generic terms like "great books" or "popular books."
7. Format: Return only the 5 queries, one per line. No bullet points, numbers, or extra text.`;

        const response: any = await fetch(
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
              temperature: 0.8,
              max_tokens: 1000,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate queries with ChatGPT");
        }

        const data: any = await response.json();
        const generatedQueries: string[] = data.choices[0].message.content
          .split("\n")
          .filter(Boolean)
          .map((query: string) => query.trim());

        // Get books from all queries in parallel
        const allResults: any[] = await Promise.all(
          generatedQueries.map((query: string) =>
            this.searchBooksWithQuery(query)
          )
        );

        // Mix books from all queries
        const mixedBooks: GoogleBooksItem[] =
          this.mixBooksFromQueries(allResults);

        // Filter out books that are already in the library
        const libraryBookIds: Set<string> = new Set(
          libraryBooks.map((book: any) => book.id)
        );
        return mixedBooks.filter((book: any) => !libraryBookIds.has(book.id));
      }

      // If no preferences provided, fetch from Firebase
      const userRef: any = doc(FIREBASE_DB, "Users", userId);
      const userSnap: any = await getDoc(userRef);
      const userData: any = userSnap.data();

      if (!userData) {
        throw new Error("User data not found");
      }

      const favoriteGenres: string[] = userData.favoriteGenres || [];
      const favoriteBooks: GoogleBooksItem[] = userData.favoriteBooks || [];
      const readBooks: GoogleBooksItem[] = userData.readBooks || [];
      const libraryBooks: GoogleBooksItem[] = userData.library || [];

      // Create multiple search queries
      const prompt = `Generate 5 diverse and creative search queries for Google Books API based on these preferences:
      - Favorite Genres: ${favoriteGenres.join(", ")}
      - Favorite Books: ${favoriteBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
      - Books already read: ${readBooks.map((book: any) => book.volumeInfo?.title).join(", ")}
      
      Requirements:
      1. Each query should be specific and targeted
      2. Include a mix of genre-based, author-based, and theme-based queries
      3. Avoid generic terms
      4. Use exact genre names, author names, or specific themes
      5. Format: Return ONLY the queries, one per line, no numbering or additional text`;

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
            temperature: 0.8,
            max_tokens: 1000,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate queries with ChatGPT");
      }

      const data: any = await response.json();
      const generatedQueries: string[] = data.choices[0].message.content
        .split("\n")
        .filter(Boolean)
        .map((query: string) => query.trim());

      // Get books from all queries in parallel
      const allResults: any[] = await Promise.all(
        generatedQueries.map((query: string) =>
          this.searchBooksWithQuery(query)
        )
      );

      // Mix books from all queries
      const mixedBooks: GoogleBooksItem[] =
        this.mixBooksFromQueries(allResults);

      // Filter out books that are already in the library
      const libraryBookIds: Set<string> = new Set(
        libraryBooks.map((book: any) => book.id)
      );
      return mixedBooks.filter((book: any) => !libraryBookIds.has(book.id));
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
    libraryBooks: GoogleBooksItem[],
    userGoal?: UserGoal
  ): Promise<string[]> {
    console.log("[getChatGPTRecommendations] Called with:", {
      favoriteGenres,
      favoriteBooksCount: favoriteBooks.length,
      readBooksCount: libraryBooks.length,
      userGoal,
    });
    try {
      const recommendationThresholdForLibraryBasedPrompt: number = 10;
      const useLibraryBasedPrompt: boolean =
        libraryBooks.length > recommendationThresholdForLibraryBasedPrompt;
      const prompt: string = `You are a smart book recommendation assistant.
      
      User preferences:
      ${useLibraryBasedPrompt ? "" : `- Favorite Genres (initial selection): ${favoriteGenres.join(", ")}`}
      - Favorite Books: ${favoriteBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Books already read or owned: ${libraryBooks.map((book) => book.volumeInfo?.title).join(", ")}
      - Reading Goal: ${userGoal?.title || "General reading"}
      
      Your task:
      Generate 3 highly creative and specific Google Books API search query strings based on the user's preferences.
      
      ${
        useLibraryBasedPrompt
          ? `This user has read many books. Focus mostly on:
      - Their actual reading history (books read or owned).
      - Suggest books that are commonly read by similar readers.
      - Identify patterns or themes in their past reads and use that to build queries.
      
      Use favorite genres only as a minor reference for variety.`
          : `The user is new or has fewer reads. Focus on:
      - Their selected favorite genres and favorite books.
      - Generate diverse queries using genres, authors, and themes from those books.`
      }
      
      Avoid:
      - Repeating books from their library.
      - Recommending books by the same author unless it's essential.
      - Using vague or generic search terms.
      
      Format:
      Return only 3 search queries, each on a new line. No numbering or explanation.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.85,
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
      console.log("[getChatGPTRecommendations] Error:", error);
      // Return random fallback queries if ChatGPT fails
      function getRandom<T>(arr: T[], fallback: T): T {
        return arr.length > 0
          ? arr[Math.floor(Math.random() * arr.length)]
          : fallback;
      }
      return [
        `subject:${getRandom(favoriteGenres, "fiction")}`,
        `inauthor:"${getRandom(
          favoriteBooks
            .map((book) => book.volumeInfo?.authors?.[0])
            .filter(Boolean),
          "J.K. Rowling"
        )}"`,
        `intitle:"${getRandom(
          favoriteBooks.map((book) => book.volumeInfo?.title),
          "The"
        )}"`,
      ];
    }
  }

  async deleteRecommendations(userId: string): Promise<void> {
    try {
      // Delete from Firebase subcollection
      const recommendationsRef: any = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const recommendationsSnap: any = await getDocs(recommendationsRef);

      const deletePromises: Promise<void>[] = recommendationsSnap.docs.map(
        (doc: any) => deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      // Clear cache
      await cacheService.delete(`recommended_books_${userId}`);

      console.log(
        "[RecommendationService] Cleared all recommendations for user:",
        userId
      );
    } catch (error) {
      console.log(
        "[RecommendationService] Error deleting recommendations:",
        error
      );
      throw error;
    }
  }

  async removeBookFromRecommendations(userId: string, bookId: string) {
    try {
      const recRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const snapshots: any = await getDocs(recRef);

      for (const snap of snapshots.docs) {
        const data: any = snap.data();
        const filteredBooks: GoogleBooksItem[] = (data.books || []).filter(
          (book: any) => book.id !== bookId
        );
        await updateDoc(doc(recRef, snap.id), { books: filteredBooks });
      }

      // Also update cache
      const cachedBooks: GoogleBooksItem[] =
        await cacheService.getRecommendedBooks(userId);
      if (cachedBooks) {
        const filteredCachedBooks: GoogleBooksItem[] = cachedBooks.filter(
          (b: any) => b.id !== bookId
        );
        await cacheService.saveRecommendedBooks(userId, filteredCachedBooks);
      }
    } catch (error) {
      console.log(
        "[RecommendationService] Error removing book from recommendations:",
        error
      );
      throw error;
    }
  }

  async saveRecommendations(
    userId: string,
    books: GoogleBooksItem[]
  ): Promise<void> {
    try {
      // Create a new document in the Recommendations subcollection
      const recommendationsRef = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );

      // Add the new recommendations with timestamp
      await addDoc(recommendationsRef, {
        books: books,
        createdAt: new Date().toISOString(),
        totalBooks: books.length,
      });

      // Save to cache
      await cacheService.saveRecommendedBooks(userId, books);
      console.log(
        `[RecommendationService] Saved ${books.length} books to cache and Firebase`
      );
    } catch (error) {
      console.log(
        "[RecommendationService] Error saving recommendations:",
        error
      );
      throw error;
    }
  }

  async getPopularBooks({
    favoriteGenres,
    selectedCountry,
    userGoal,
    favoriteAuthors,
    unforgettableBook,
  }: {
    favoriteGenres: string[];
    selectedCountry: string;
    userGoal: UserGoal;
    favoriteAuthors: string;
    unforgettableBook: string;
  }): Promise<GoogleBooksItem[]> {
    const genreCount: number = favoriteGenres.length;
    const genreList: string = favoriteGenres.join(", ");
    let prompt: string;
    console.log(favoriteAuthors, "favoriteAuthors:490");
    console.log(unforgettableBook, "unforgettableBook:491");
    switch (userGoal.id) {
      case "classics":
        prompt = `You are a smart book curator.
    
    List at least 10 classic literary works that are considered timeless and culturally significant in ${selectedCountry}. The books should specifically fall within the following genres: ${genreList}.
    
    Make sure to:
    - Include the user's unforgettable book "${unforgettableBook}" if relevant, or include books similar in style, theme, or impact.
    - Prioritize books written by or similar to the user's favorite authors: ${favoriteAuthors}.
    - Include a mix of older and 20th-century works.
    - Include titles recognized in schools or literary history.
    - Focus on works that had strong impact in ${selectedCountry}'s literary scene.
    
    Format:
    - Book Title – Author`;
        break;

      case "contemporary":
        prompt = `Act as a contemporary literature expert.
    
    List at least 10 popular and recent books (published in the last 10 years) from ${selectedCountry} specifically in the genres: ${genreList}.
    
    Make sure to:
    - Prioritize books by or similar to the user's favorite authors: ${favoriteAuthors}.
    - Include books similar to "${unforgettableBook}" if applicable.
    - Ensure diversity across recent bestsellers, award nominees, and trending books.
    - Only include titles that are relevant and well-received today.
    
    Format:
    - Book Title – Author`;
        break;

      case "genres":
        prompt = `As a genre expert, recommend 10 engaging books from ${selectedCountry}.
    
    User's favorite genres: ${genreList}  
    Also consider a few books (2–4 max) from contrasting or complementary genres for discovery.
    
    Make sure to:
    - Focus mainly on the listed favorite genres (about 70–80%).
    - Include books by or similar to favorite authors: ${favoriteAuthors}.
    - Include works thematically or stylistically similar to "${unforgettableBook}".
    - Provide variety but ensure high relevance to the user's taste.
    
    Format:
    - Book Title – Author (Genre)`;
        break;

      case "authors":
        prompt = `Act as a literary critic.
    
    List 10 highly influential or well-known authors from ${selectedCountry} who are recognized for writing in the following genres: ${genreList}.
    
    For each author:
    - If possible, match with or relate to user's favorite authors: ${favoriteAuthors}.
    - If applicable, include authors of or similar to "${unforgettableBook}".
    - For each author, provide 2–3 of their most impactful or bestselling books.
    
    Format:
    - Author Name
      - Book 1
      - Book 2
      - ...`;
        break;

      default:
        prompt = `List 10 popular or bestselling books from ${selectedCountry} that span across the genres: ${genreList}.
    
    Make sure to:
    - Prioritize books by or related to user's favorite authors: ${favoriteAuthors}.
    - Include books thematically or stylistically close to "${unforgettableBook}".
    - Ensure a mix of critically acclaimed books, award winners, and reader favorites.
    
    Format:
    - Book Title – Author`;
    }

    console.log("Generated prompt:", prompt);

    const response: any = await fetch(
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
          temperature: 0.85,
          frequency_penalty: userGoal.id === "authors" ? 0.1 : 0.25, // if user say it is important to include authors, then we use 0.1
          presence_penalty: userGoal.id === "genres" ? 0.8 : 0.25, // if user say it is important to include other genres, then we use 0.8
        }),
      }
    );

    const data: any = await response.json();

    const content: string = data.choices?.[0]?.message?.content || "";
    const lines: string[] = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    console.log(lines, "lines:591");

    const gptBookItems: { title: string; author: string }[] = [];

    lines.forEach((line: string) => {
      const normalizedLine: string = line
        .replace(/[“”]/g, '"')
        .replace(/[–—]/g, "-");

      const match = normalizedLine.match(/^(?:\d+\.\s*)?"?(.*?)"?\s*-\s*(.*)$/);
      if (match) {
        const title = match[1].trim().replace(/^"|"$/g, "");
        const author = match[2].trim();
        if (title && author) {
          gptBookItems.push({ title, author });
        }
      }
    });

    console.log("Authors by genre:", ...gptBookItems.entries());
    const booksByGenre: Map<string, GoogleBooksItem[]> = new Map();
    const uniqueBooksMap: Map<string, GoogleBooksItem> = new Map();
    const finalBooks: GoogleBooksItem[] = [];

    // Prioritize books by favorite authors
    if (favoriteAuthors) {
      console.log("Starting API call for author books");
      const authorBooks: GoogleBooksItem[] = (
        await Promise.all(
          favoriteAuthors.split(",").map(async (author: string) => {
            console.log("Fetching books for author:", author);
            const maxPerPage: number = 40;
            const orderBy: string = "relevance";
            const res: any = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author.trim())}&printType=books&maxResults=${maxPerPage}&orderBy=${orderBy}`
            );
            const json: any = await res.json();
            return json.items || [];
          })
        )
      ).flat();

      console.log("authorBooks", authorBooks.length);
      authorBooks.forEach((book: GoogleBooksItem) => {
        const id: string = book.id;
        const title: string = book.volumeInfo?.title;
        if (
          id &&
          !uniqueBooksMap.has(id) &&
          title &&
          title !== uniqueBooksMap.get(id)?.volumeInfo?.title
        ) {
          uniqueBooksMap.set(id, book);
          finalBooks.push(book);
        }
      });
      console.log("API call completed for author books");
    }

    for (const genre of favoriteGenres) {
      console.log("Processing genre:", genre);
      const authors: string[] = gptBookItems
        .filter(({ author }) => author && author.length > 0)
        .map(({ author }) => author);

      if (authors.length === 0) {
        console.log("No authors found for genre:", genre);
        continue;
      }
      const orderBy: string = "relevance";
      const authorBooks: GoogleBooksItem[] = (
        await Promise.all(
          authors.map(async (author: string) => {
            try {
              const maxPerPage: number = 20;
              const res: any = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&printType=books&maxResults=${maxPerPage}&orderBy=${orderBy}`
              );
              const json: any = await res.json();
              return json.items || [];
            } catch (error) {
              console.error("Error fetching books for author:", author, error);
              return [];
            }
          })
        )
      ).flat();

      // If not enough books from authors, get from genre keywords
      let genreBooks: GoogleBooksItem[] = authorBooks;
      const minBooks: number = genreCount === 1 ? 50 : genreCount * 50;

      if (authorBooks.length < minBooks / genreCount) {
        const keywordQuery: string = `bestseller ${genre} books in ${selectedCountry} `;
        const maxResultsPerPage: number = 40; // Results per page

        const orderBy: string = "relevance";
        console.log("Fetching books for genre keyword:", keywordQuery, "page:");
        const res: any = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keywordQuery)}&printType=books&maxResults=${maxResultsPerPage}&orderBy=${orderBy}`
        );
        const json: any = await res.json();
        genreBooks = [...genreBooks, ...(json.items || [])];
      }
      const filtered: GoogleBooksItem[] = genreBooks.filter(
        (book: GoogleBooksItem) => {
          const id: string = book.id;
          const title: string = book.volumeInfo?.title;

          if (!id || !title || uniqueBooksMap.has(id)) return false;

          uniqueBooksMap.set(id, book);
          return true;
        }
      );
      booksByGenre.set(genre, filtered);
    }

    booksByGenre.forEach((books: GoogleBooksItem[]) => {
      finalBooks.push(...books);
    });
    finalBooks.filter((book: GoogleBooksItem) => {
      const id: string = book.id;
      const title: string = book.volumeInfo?.title;
      if (!id || uniqueBooksMap.has(id)) return false;
      if (title && title !== uniqueBooksMap.get(id)?.volumeInfo?.title) {
        uniqueBooksMap.set(id, book);
      }
      return true;
    });
    console.log("Final books count:", finalBooks.length);

    // Process lines to extract book titles and authors

    lines.forEach((line: string) => {
      const match: string[] | null = line.match(
        /^(?:\d+\.\s*)?(.*?)\s*[-–—]\s*(.*)$/
      );
      if (match) {
        const title: string = match[1].trim();
        const author: string = match[2].trim();
        if (title && author) {
          gptBookItems.push({ title, author });
        }
      }
    });

    // Search Google Books API with extracted titles and authors
    const gptBooks: GoogleBooksItem[] = (
      await Promise.all(
        gptBookItems.map(async ({ title, author }) => {
          const maxPerPage: number = 5;
          const orderBy: string = "relevance";
          const query: string = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
          const res: any = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${query}&printType=books&maxResults=${maxPerPage}&orderBy=${orderBy}`
          );
          const json: any = await res.json();
          return json.items || [];
        })
      )
    ).flat();

    // Add results to finalBooks
    console.log("gptBooks", gptBooks.length);
    gptBooks.forEach((book: GoogleBooksItem) => {
      const id: string = book.id;
      const title: string = book.volumeInfo?.title;
      if (
        id &&
        !uniqueBooksMap.has(id) &&
        title &&
        title !== uniqueBooksMap.get(id)?.volumeInfo?.title
      ) {
        uniqueBooksMap.set(id, book);
        finalBooks.push(book);
      }
    });

    console.log("Final books count after GPT additions:", finalBooks.length);

    const shuffledBooks: GoogleBooksItem[] = this.shuffleArray(finalBooks);
    console.log("Shuffled books count:", shuffledBooks.length);
    return shuffledBooks;
  }
}
