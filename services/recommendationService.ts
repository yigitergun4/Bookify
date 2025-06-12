import { FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { CacheService } from "./cacheService";
import { ApiError } from "../utils/apiUtils";
import ENV from "@/config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { UserGoal } from "@/types/usersdatatypes";
import { OpenAI } from "openai";

const cacheService = CacheService.getInstance();

export class RecommendationError extends ApiError {
  constructor(message: string, statusCode?: number, originalError?: any) {
    super(message, statusCode, originalError);
    this.name = "RecommendationError";
  }
}

export class RecommendationService {
  private static instance: RecommendationService;
  private openai: OpenAI;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY,
    });
  }

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

  async searchBooksWithQuery(query: string): Promise<GoogleBooksItem[]> {
    try {
      console.log("Searching books with query:", query);
      const maxResultsPerPage: number = 20;
      const orderBy: string = "relevance";

      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&printType=books&maxResults=${maxResultsPerPage}&orderBy=${orderBy}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items) {
        console.log("No books found for query:", query);
        return [];
      }

      console.log(`Found ${data.items.length} books for query:`, query);
      return data.items;
    } catch (error) {
      console.error("[RecommendationService] Error searching books:", {
        query,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  async getChatGPTRecommendations(
    favoriteGenres: string[],
    favoriteBooks: string[],
    libraryBooks: GoogleBooksItem[],
    favoriteAuthors: string,
    unforgettableBook: string,
    userGoal?: UserGoal
  ): Promise<string[]> {
    const libraryTitles = libraryBooks.map(
      (book) => book.volumeInfo?.title || ""
    );

    const prompt = (() => {
      const genres = favoriteGenres.join(", ");
      const books = favoriteBooks.join(", ");
      const authors = favoriteAuthors || "None";
      const unforgettable = unforgettableBook || "None";
      const avoidTitles = libraryTitles.join(", ");
      const goalDescription = userGoal?.description || "None";

      switch (userGoal?.id) {
        case "classics":
          return `You are helping construct advanced search queries for a book discovery system.
    
    Generate 5 Google Books API queries that help the user discover **classic and timeless literature** from various cultures and eras.
    
    User Preferences:
    - Favorite genres: ${genres}
    - Favorite books: ${books}
    - Favorite authors: ${authors}
    - Unforgettable book: ${unforgettable}
    
    Ensure:
    - Focus on classics and literary masterpieces
    - Include some queries for 19th and early 20th century
    - Avoid books already known: ${avoidTitles}
    - No explanations or numbering, just the queries.`;

        case "contemporary":
          return `You're creating smart Google Books API queries for someone who wants **modern and trending books**.
    
    User Preferences:
    - Favorite genres: ${genres}
    - Favorite books: ${books}
    - Favorite authors: ${authors}
    - Unforgettable book: ${unforgettable}
    
    Requirements:
    - Only books published in the last 10 years
    - Mix of bestsellers, award winners, and recent favorites
    - Avoid already known titles: ${avoidTitles}
    - Return exactly 5 creative search queries, one per line, no numbering.`;

        case "genres":
          return `You are assisting in generating creative genre-diverse Google Books API queries.
    
    User Preferences:
    - Favorite genres: ${genres}
    - Favorite books: ${books}
    - Favorite authors: ${authors}
    - Unforgettable book: ${unforgettable}
    
    Goal:
    - Explore books in favorite and **complementary genres**
    - Some genre mashups or unexpected cross-genre queries
    - Avoid these books: ${avoidTitles}
    - Output: 5 distinct search queries only, one per line, no explanations.`;

        case "authors":
          return `You're designing Google Books API queries to help a reader discover **books by favorite or similar authors**.
    
    User Preferences:
    - Favorite genres: ${genres}
    - Favorite books: ${books}
    - Favorite authors: ${authors}
    - Unforgettable book: ${unforgettable}
    
    Instructions:
    - Focus on author-based discovery (e.g. "books by", "similar to", "inspired by")
    - Highlight similar writing style or themes
    - Exclude these titles: ${avoidTitles}
    - Return 5 concise, author-oriented queries. No explanations or numbering.`;

        default:
          return `I need book search queries for the Google Books API based on the following preferences:
    - Favorite genres: ${genres}
    - Favorite books: ${books}
    - Favorite authors: ${authors}
    - Unforgettable book: ${unforgettable}
    - User goal: ${goalDescription}
    
    Generate exactly 5 concise and creative search queries (no explanations) that help discover new books aligned with these preferences.
    Avoid mentioning books with these titles: ${avoidTitles}
    
    Format: One query per line, no numbering.`;
      }
    })();
    console.log(prompt, "prompt:onboarding");

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // gpt-4o-mini kullanıyorum çünkü yapılan iş için yeterli
        messages: [
          {
            role: "system",
            content:
              "You are a book recommendation expert. Generate specific search queries to use with Google Books API.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        frequency_penalty: userGoal?.id === "authors" ? 0.1 : 0.25,
        presence_penalty: userGoal?.id === "genres" ? 0.8 : 0.25,
        max_tokens: 600,
      });

      const queries = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      if (!queries || queries.length === 0)
        throw new Error("No queries returned from ChatGPT.");

      console.log("GPT Search Queries:", queries, "queries:onboarding");
      return queries;
    } catch (error) {
      console.error("Error generating ChatGPT search queries:", error);
      return [];
    }
  }
  async getChatGPTRecommendationsForLoadMore(
    libraryBooks: GoogleBooksItem[],
    userGoal: UserGoal,
    favoriteGenres: string[],
    unforgettableBook: GoogleBooksItem[]
  ): Promise<string[]> {
    const authorsFromLibrary: string[] = libraryBooks
      .map((book) => book.volumeInfo?.authors || [])
      .flat()
      .filter(Boolean);

    const unforgettableBookList: string[] = unforgettableBook
      .map((book: GoogleBooksItem) => book.volumeInfo?.authors || "")
      .flat()
      .filter(Boolean);

    const authorList: string = Array.from(
      new Set([...authorsFromLibrary, ...unforgettableBookList])
    ).join(", ");

    const genreList: string = favoriteGenres.join(", ");
    const libraryTitles: string = libraryBooks
      .map((book) => book.volumeInfo?.title || "")
      .join(", ");
    const goalDescription: string = userGoal?.description || "discover books";

    const prompt: string = (() => {
      const sharedHeader = `
    You're a book recommendation engine generating personalized and creative Google Books API search queries.
    
    User’s preferences:
    - Favorite genres: ${genreList}
    - Favorite authors (from library and unforgettable books): ${authorList}
    - User goal: ${goalDescription}
    
    Already known book titles (in library): ${libraryTitles}
    `;

      switch (userGoal.id) {
        case "classics":
          return `${sharedHeader}
    
    Instructions:
    - Generate 5 search queries:
      - 2 should be based on the user's actual favorite authors and their known works (e.g., “books by Dostoevsky” or “read '1984' again”).
      - 3 should help explore other timeless classics from different cultures and historical eras.
    - Include 19th–20th century authors if relevant.
    - You may repeat a known author or book if it fits the user’s goal (e.g., re-reading or deepening).
    - Avoid excessive duplication.
    - Return only the 5 queries — no numbers, no explanation.`;

        case "contemporary":
          return `${sharedHeader}
    
    Instructions:
    - Generate 5 modern search queries:
      - 2 based on favorite authors or books the user already enjoyed (even repeating titles is okay if intentional).
      - 3 exploring fresh books from the last 10 years: bestsellers, award-winners, or stylistically similar.
    - Include genre or theme variety.
    - Prioritize relevance over novelty.
    - No extra formatting. Return only 5 queries.`;

        case "genres":
          return `${sharedHeader}
    
    Instructions:
    - Build 5 genre-creative search queries:
      - 2 directly referencing user's favorite books or authors (e.g., "more like 'The Road' by Cormac McCarthy").
      - 3 exploring cross-genre, mashup, or contrasting genres the user may enjoy.
    - Use combinations like “philosophical sci-fi” or “romantic horror”.
    - Returning a known book is allowed if it fits a genre-mixing purpose.
    - Return only 5 distinct queries, no explanation.`;

        case "authors":
          return `${sharedHeader}
    
    Instructions:
    - Focus on author-based discovery.
    - Generate 5 queries:
      - 2 about books by the user’s favorite authors (same authors and books allowed).
      - 3 suggesting authors or books with similar writing style, themes, or reputation.
    - Mentioning a previously read book or author again is fine if highly relevant.
    - No explanation, no numbering — return only 5 search queries.`;

        default:
          return `${sharedHeader}
    
    Instructions:
    - Generate a mix of 5 creative queries:
      - 2 directly based on user's own authors or favorite books (you may include repeated works if relevant).
      - 3 based on genre or user goal, encouraging discovery and variety.
    - Avoid repeating titles unnecessarily unless for re-reading or deepening experience.
    - Output 5 queries. No extra text, no numbering.`;
      }
    })();

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a book search expert. Generate specific, diverse, and creative queries for Google Books API.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
        presence_penalty: 0.5,
        frequency_penalty: 0.3,
        max_tokens: 600,
      });

      const queries = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      if (!queries || queries.length === 0) {
        throw new Error("No queries returned from ChatGPT.");
      }

      console.log("ChatGPT LoadMore Queries:", queries);
      return queries;
    } catch (error) {
      console.error(
        "GPT error in getChatGPTRecommendationsForLoadMore:",
        error
      );
      return [];
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
    GENRES,
  }: {
    favoriteGenres: string[];
    selectedCountry: string;
    userGoal: UserGoal;
    favoriteAuthors: string;
    unforgettableBook: string;
    GENRES: string[];
  }): Promise<GoogleBooksItem[]> {
    const genreCount: number = favoriteGenres.length;
    const genreList: string = favoriteGenres.join(", ");
    let prompt: string;

    console.log(favoriteAuthors, "favoriteAuthors");
    console.log(unforgettableBook, "unforgettableBook");
    console.log(userGoal.id, "userGoal.id");
    console.log(favoriteGenres, "favoriteGenres");
    console.log(selectedCountry, "selectedCountry");
    console.log(genreList, "genreList");
    console.log(genreCount, "genreCount");

    switch (userGoal.id) {
      case "classics":
        prompt = `You are a literary recommendation engine preparing data for Google Books API.
  
  List 10 culturally significant and timeless classic literary works in ${selectedCountry} that fit these genres: ${genreList}.
  
  Consider:
  - The user's unforgettable book: "${unforgettableBook}" (include similar styles/themes).
  - The user's favorite authors: ${favoriteAuthors || "None"}.
  - Include works from both older and 20th-century periods.
  - Avoid duplicates or books likely to already exist in the user's collection.
  
  IMPORTANT: Format each line EXACTLY as: "Book Title" - Author Name
  Example:
  "The Great Gatsby" - F. Scott Fitzgerald
  "1984" - George Orwell`;
        break;

      case "contemporary":
        prompt = `You are a book data specialist helping with API search queries.
  
  List 10 popular and critically acclaimed books published in the last 10 years from ${selectedCountry} in the genres: ${genreList}.
  
  Include:
  - Similar style or theme to the book: "${unforgettableBook}".
  - Books by or similar to authors: ${favoriteAuthors || "None"}.
  - A mix of bestsellers, award winners, and reader favorites.
  
  IMPORTANT: Format each line EXACTLY as: "Book Title" - Author Name
  Example:
  "The Midnight Library" - Matt Haig
  "Project Hail Mary" - Andy Weir`;
        break;

      case "genres":
        prompt = `You are helping create tailored search queries for a personalized book recommendation system.
  
  Recommend 10 highly engaging books from ${selectedCountry}.
  
  Include:
  - Mostly from the user's favorite genres: ${genreList}.
  - Some variety from complementary genres.
  - Books stylistically or thematically like "${unforgettableBook}".
  - Authors similar to or inspired by: ${favoriteAuthors || "None"}.
  
  IMPORTANT: Format each line EXACTLY as: "Book Title" - Author Name
  Example:
  "The Seven Husbands of Evelyn Hugo" - Taylor Jenkins Reid
  "Klara and the Sun" - Kazuo Ishiguro`;
        break;

      case "authors":
        prompt = `You are helping match authors and books for Google Books API queries.
  
  List 10 highly influential authors from ${selectedCountry} in these genres: ${genreList}.
  
  For each author:
  - Provide 2–3 bestselling or critically recognized books.
  - Relate the authors to: ${favoriteAuthors || "None"} or "${unforgettableBook}" when possible.
  
  IMPORTANT: Format each line EXACTLY as: "Book Title" - Author Name
  Example:
  "Norwegian Wood" - Haruki Murakami
  "Kafka on the Shore" - Haruki Murakami`;
        break;

      default:
        prompt = `You are an AI assistant helping generate search queries for Google Books API.
  
  List 10 great recommendations from ${selectedCountry} across these genres: ${genreList}.
  
  Ensure:
  - A mix of genre-based and author-inspired selections.
  - Similarity to "${unforgettableBook}" in tone or story.
  - Authors connected to: ${favoriteAuthors || "None"}.
  
  IMPORTANT: Format each line EXACTLY as: "Book Title" - Author Name
  Example:
  "The Song of Achilles" - Madeline Miller
  "Piranesi" - Susanna Clarke`;
    }

    console.log("Generated prompt for ChatGPT:\n", prompt);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // gpt-4o-mini kullanıyorum çünkü yapılan iş için yeterli
        messages: [
          {
            role: "system",
            content:
              'You are a book recommendation expert. Generate specific book-author pairs based on user preferences. Always use the exact format: "Book Title" - Author Name',
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        frequency_penalty: userGoal?.id === "authors" ? 0.1 : 0.25,
        presence_penalty: userGoal?.id === "genres" ? 0.8 : 0.25,
        max_tokens: 500,
      });

      const lines = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const gptBookItems: { title: string; author: string }[] = [];

      lines?.forEach((line) => {
        const normalizedLine = line
          .replace(/^\d+[\.\)\-–—\s]*/, "")
          .replace(/[""„"]/g, '"')
          .replace(/[–—]/g, "-");

        const separatorIndex = normalizedLine.indexOf(" - ");
        if (separatorIndex !== -1) {
          const rawTitle = normalizedLine
            .slice(0, separatorIndex)
            .trim()
            .replace(/^"|"$/g, "");
          const rawAuthor = normalizedLine.slice(separatorIndex + 3).trim();

          if (rawTitle && rawAuthor) {
            gptBookItems.push({ title: rawTitle, author: rawAuthor });
          }
        }
      });

      const uniqueBooksMap: Map<string, GoogleBooksItem> = new Map();
      const finalBooks: GoogleBooksItem[] = [];

      // First, parse author names using ChatGPT
      const authorPrompt = `Parse the following author names into a comma-separated list. If there are multiple authors, separate them with commas. Return only the comma-separated list, no explanations:

Authors: ${favoriteAuthors}`;

      const authorCompletion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // gpt-4o-mini kullanıyorum çünkü yapılan iş için yeterli
        messages: [{ role: "user", content: authorPrompt }],
        temperature: 0.3,
      });

      const parsedAuthors =
        authorCompletion.choices[0]?.message?.content?.trim() || "";
      console.log("Parsed authors:", parsedAuthors);

      // Parse unforgettable book using ChatGPT
      const bookPrompt = `Analyze this book title and generate 3 different search queries to find similar books. Return only the queries, one per line, no explanations:

Book: ${unforgettableBook}`;

      let bookCompletion: any;
      let parsedBookQueries: string[] = [];

      if (unforgettableBook) {
        bookCompletion = await this.openai.chat.completions.create({
          model: "gpt-4o-mini", // gpt-4o-mini kullanıyorum çünkü yapılan iş için yeterli
          messages: [{ role: "user", content: bookPrompt }],
          temperature: 0.3,
        });
        parsedBookQueries =
          bookCompletion.choices[0]?.message?.content?.trim().split("\n") || [];
        console.log("Parsed book queries:", parsedBookQueries);
      }

      const gptAuthors = [
        ...new Set([
          ...gptBookItems.map((item) => item.author),
          ...parsedAuthors
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        ]),
      ];

      const authorBooks: GoogleBooksItem[] = (
        await Promise.all(
          gptAuthors.map(async (author) => {
            try {
              const query = `inauthor:"${author}"`;
              const maxResults: number = 10;
              console.log(`Fetching books for author: ${author}`);
              const res = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                  query
                )}&printType=books&maxResults=${maxResults}&orderBy=relevance`
              );
              const json = await res.json();
              console.log(
                `Found ${json.items?.length || 0} books for author: ${author}`
              );
              console.log(
                json.items.map((item: any) => item.volumeInfo.title),
                `sonuc:${author}`
              );
              return json.items || [];
            } catch (err) {
              console.log("Error fetching author books:", err);
              return [];
            }
          })
        )
      ).flat();

      authorBooks.forEach((book) => {
        const id = book.id;
        const title = book.volumeInfo?.title;
        if (id && title && !uniqueBooksMap.has(id)) {
          uniqueBooksMap.set(id, book);
          finalBooks.push(book);
        }
      });

      // Process user's favorite genres first
      for (const genre of favoriteGenres) {
        const base = 40;
        const extra = 25;
        const total = base + (genreCount - 1) * extra;
        const currentYear = new Date().getFullYear();
        const fromYear = currentYear - 5;

        let searchQueries: string[];
        switch (userGoal.id) {
          case "classics":
            searchQueries = [
              `classic ${genre} books from ${selectedCountry}`,
              `timeless ${genre} literature in ${selectedCountry}`,
              `historical ${genre} books from ${selectedCountry}`,
              `old ${genre} bestsellers in ${selectedCountry}`,
            ];
            break;
          case "contemporary":
            searchQueries = [
              `recent ${genre} books in ${selectedCountry}`,
              `critically acclaimed ${genre} books from ${selectedCountry}`,
              `bestselling modern ${genre} books in ${selectedCountry}`,
              `best ${genre} books published after ${fromYear} in ${selectedCountry}`,
            ];
            break;
          case "authors":
            searchQueries = [
              `${genre} books by famous authors`,
              `notable ${genre} authors`,
              `${genre} books by influential writers`,
              `bestseller ${genre} books by top authors`,
            ];
            break;
          case "genres":
            searchQueries = [
              `popular ${genre} books in ${selectedCountry}`,
              `reader favorite ${genre} books from ${selectedCountry}`,
              `highly rated ${genre} novels in ${selectedCountry}`,
              `bestselling ${genre} books and some other genres from ${selectedCountry}`,
            ];
            break;
          default:
            searchQueries = [
              `best seller ${genre} books in ${selectedCountry}`,
              `popular ${genre} books in ${selectedCountry}`,
              `${genre} books in ${selectedCountry}`,
              `new ${genre} books in ${selectedCountry}`,
            ];
        }

        for (const query of searchQueries) {
          try {
            console.log(`Fetching books with query: "${query}"`);
            const res = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                query
              )}&printType=books&maxResults=${Math.ceil(total / searchQueries.length)}&orderBy=relevance`
            );
            const json = await res.json();
            const items = json.items || [];

            console.log(`Found ${items.length} books for query: "${query}"`);

            items.forEach((book: GoogleBooksItem) => {
              const id = book.id;
              const title = book.volumeInfo?.title;
              if (id && title && !uniqueBooksMap.has(id)) {
                uniqueBooksMap.set(id, book);
                finalBooks.push(book);
              }
            });
          } catch (err) {
            console.error("Error in Google Books fetch:", err);
          }
        }
      }

      // Now process unselected genres
      if (userGoal.id === "genres") {
        // First, get additional genres that user hasn't selected
        const unselectedGenres = GENRES.filter(
          (genre: string) => !favoriteGenres.includes(genre)
        );
        // Randomly select 4 different genres from the remaining ones
        const randomUnselectedGenres = unselectedGenres
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);

        for (const genre of randomUnselectedGenres) {
          const searchQueries = [
            `highly rated ${genre} books in ${selectedCountry}`,
            `bestselling ${genre} books from ${selectedCountry}`,
          ];

          for (const query of searchQueries) {
            const maxResults: number = 2;
            const orderBy: string = "relevance";
            try {
              console.log(
                `Fetching unselected genre books with query: "${query}"`
              );
              const res = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                  query
                )}&printType=books&maxResults=${maxResults}&orderBy=${orderBy}`
              );
              const json = await res.json();
              const items = json.items || [];

              console.log(
                `Found ${items.length} unselected genre books for query: "${query}"`
              );

              items.forEach((book: GoogleBooksItem) => {
                const id = book.id;
                const title = book.volumeInfo?.title;
                if (id && title && !uniqueBooksMap.has(id)) {
                  uniqueBooksMap.set(id, book);
                  finalBooks.push(book);
                }
              });
            } catch (err) {
              console.error("Error fetching unselected genre books:", err);
            }
          }
        }
      }

      // Now process unforgettable book queries
      if (parsedBookQueries.length > 0) {
        for (const query of parsedBookQueries) {
          try {
            console.log(
              `Fetching books related to unforgettable book: "${query}"`
            );
            const res = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                query
              )}&printType=books&maxResults=4&orderBy=relevance`
            );
            const json = await res.json();
            const items = json.items || [];

            console.log(`Found ${items.length} books for unforgettable query`);

            items.forEach((book: GoogleBooksItem) => {
              const id = book.id;
              const title = book.volumeInfo?.title;
              if (id && title && !uniqueBooksMap.has(id)) {
                uniqueBooksMap.set(id, book);
                finalBooks.push(book);
              }
            });
          } catch (err) {
            console.error(
              "Error fetching unforgettable book related books:",
              err
            );
          }
        }
      }

      const uniqueFinalBooks = finalBooks.filter(
        (b, i, arr) => arr.findIndex((x) => x.id === b.id) === i
      );

      console.log(
        `Total unique books after all filtering: ${uniqueFinalBooks.length}`
      );
      return this.shuffleArray(uniqueFinalBooks);
    } catch (err) {
      console.error("Error in getPopularBooks:", err);
      return [];
    }
  }
}
