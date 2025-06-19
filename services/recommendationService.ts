import { FIREBASE_DB } from "@/FirebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  doc,
  updateDoc,
  QuerySnapshot,
  DocumentData,
  CollectionReference,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { CacheService } from "./cacheService";
import { ApiError } from "../utils/apiUtils";
import ENV from "@/config/env";
import { GoogleBooksItem } from "@/types/booksapitypes";
import { UserGoal } from "@/types/usersdatatypes";
import { OpenAI } from "openai";

const cacheService: CacheService = CacheService.getInstance();

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

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled: T[] = [...array];
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

      const url: string = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&printType=books&maxResults=${maxResultsPerPage}&orderBy=${orderBy}`;

      const response: any = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();

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
    favoriteBooks: GoogleBooksItem[],
    library: GoogleBooksItem[],
    userGoal: UserGoal | null,
    favoriteAuthors: string[]
  ): Promise<string[]> {
    try {
      const prompt = `You're a recommendation engine generating **exactly 4 personalized Google Books API queries**, based solely on the user's own preferences. Use only the data provided — no assumptions or similarity-based logic.
  
  User's preferences:
  - Favorite genres: ${favoriteGenres.join(", ")}
  - Favorite books: ${favoriteBooks.map((book) => book.volumeInfo.title).join(", ")}
  - Favorite authors: ${favoriteAuthors.join(", ") || "None"}
  - Unforgettable book: ${userGoal?.title || "None"}
  - User goal: ${userGoal?.description || "None"}
  - Already known book titles: ${library.map((book) => book.volumeInfo.title).join(", ")}
  
  
  Instructions:
  - Based only on the user's preferences, generate 4 relevant queries.
  - Use any combination of books, genres, or authors the user provided.
  - You may repeat known content if it matches the user's goal.
  - Return exactly 4 queries, no explanations.`;

      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new RecommendationError("No response from ChatGPT");
      }

      // Split the response into individual queries and clean them up
      const queries = response
        .split("\n")
        .map((query) => query.trim())
        .filter((query) => query.length > 0)
        .slice(0, 4);

      if (queries.length !== 4) {
        throw new RecommendationError("Invalid number of queries generated");
      }

      return queries;
    } catch (error) {
      console.error("Error getting ChatGPT recommendations:", error);
      throw new RecommendationError(
        "Failed to get recommendations",
        500,
        error
      );
    }
  }

  async getChatGPTRecommendationsForLoadMore(
    libraryBooks: GoogleBooksItem[],
    userGoal: UserGoal,
    favoriteGenres: string[],
    unforgettableBook: string
  ): Promise<string[]> {
    const authorsFromLibrary: string[] = libraryBooks
      .map((book: GoogleBooksItem) => book.volumeInfo?.authors || [])
      .flat()
      .filter(Boolean);

    const uniqueAuthors: string[] = Array.from(new Set(authorsFromLibrary));

    // Rastgele 3 yazar seç
    const shuffledAuthors: string[] = uniqueAuthors.sort(
      () => 0.5 - Math.random()
    );
    const selectedAuthors: string[] = shuffledAuthors.slice(0, 2); // veya Math.min(3, uniqueAuthors.length)
    const authorList: string = selectedAuthors.join(", ");

    const sampledAuthors: string = authorList;

    const unforgettableBookList: string[] = unforgettableBook
      .split(",")
      .map((title: string) => title.trim())
      .filter(Boolean);

    const sampledUnforgettableBooks: string = unforgettableBookList
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .join(", ");

    const genreList: string = favoriteGenres.join(", ");
    const libraryTitles: string = libraryBooks
      .map((book: GoogleBooksItem) => book.volumeInfo?.title || "")
      .filter(Boolean)
      .join(", ");
    const goalDescription: string = userGoal?.description || "discover books";

    const prompt: string = (() => {
      const sharedHeader: string = `
  You're a book recommendation engine generating personalized and creative Google Books API search queries.
  
  User's preferences:
  - Favorite genres: ${genreList}
  - Sampled favorite authors: ${sampledAuthors}
  - Sampled unforgettable books: ${sampledUnforgettableBooks}
  - User goal: ${goalDescription}
  - Already known book titles to avoid: ${libraryTitles}
  
  RULES:
  - Vary each query in terms of genre, style, or focus.
  - No repeated authors in queries.
  - Output exactly 5 queries. No explanations or numbering.
  `;

      switch (userGoal.id) {
        case "classics":
          return `${sharedHeader}
  
  Instructions:
  - 2 queries based directly on sampled authors or unforgettable books (e.g., "books by Leo Tolstoy").
  - 3 queries that explore other classic literature from diverse cultures (19th–20th century ideal).
  `;

        case "contemporary":
          return `${sharedHeader}
  
  Instructions:
  - 2 queries based on sampled authors or unforgettable books.
  - 3 queries focused on modern, trending literature from the last 10 years (bestsellers, stylistic matches).
  `;

        case "genres":
          return `${sharedHeader}
  
  Instructions:
  - 2 queries using sampled authors or unforgettable books in unique genre blends.
  - 3 queries mixing genres like "romantic sci-fi" or "psychological horror".
  `;

        case "authors":
          return `${sharedHeader}
  
  Instructions:
  - 2 queries for books by sampled authors.
  - 3 queries suggesting authors similar in tone, theme, or genre.
  `;

        default:
          return `${sharedHeader}
  
  Instructions:
  - 2 queries based on the sampled authors and unforgettable books.
  - 3 additional genre-based creative queries, aligned with user goal.
  `;
      }
    })();

    try {
      const response: any = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a book search expert. Generate specific, diverse, and creative queries for Google Books API.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.9, // Biraz daha rastlantısallık katmak için artırıldı
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        max_tokens: 600,
      });

      const queries: string[] = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line: string) => line.trim())
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
      const recommendationsRef: CollectionReference<DocumentData> = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const recommendationsSnap: QuerySnapshot<DocumentData> =
        await getDocs(recommendationsRef);

      const deletePromises: Promise<void>[] = recommendationsSnap.docs.map(
        (doc: QueryDocumentSnapshot<DocumentData>) => deleteDoc(doc.ref)
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
      const recRef: CollectionReference<DocumentData> = collection(
        FIREBASE_DB,
        "Users",
        userId,
        "Recommendations"
      );
      const snapshots: QuerySnapshot<DocumentData> = await getDocs(recRef);

      for (const snap of snapshots.docs) {
        const data: any = snap.data();
        const filteredBooks: GoogleBooksItem[] = (data.books || []).filter(
          (book: GoogleBooksItem) => book.id !== bookId
        );
        await updateDoc(doc(recRef, snap.id), { books: filteredBooks });
      }

      // Also update cache
      const cachedBooks: GoogleBooksItem[] =
        await cacheService.getRecommendedBooks(userId);
      if (cachedBooks) {
        const filteredCachedBooks: GoogleBooksItem[] = cachedBooks.filter(
          (b: GoogleBooksItem) => b.id !== bookId
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
      const recommendationsRef: CollectionReference<DocumentData> = collection(
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

      const lines: any = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      const gptBookItems: { title: string; author: string }[] = [];

      lines?.forEach((line: string) => {
        const normalizedLine: string = line
          .replace(/^\d+[\.\)\-–—\s]*/, "")
          .replace(/[""„"]/g, '"')
          .replace(/[–—]/g, "-");

        const separatorIndex: number = normalizedLine.indexOf(" - ");
        if (separatorIndex !== -1) {
          const rawTitle: string = normalizedLine
            .slice(0, separatorIndex)
            .trim()
            .replace(/^"|"$/g, "");
          const rawAuthor: string = normalizedLine
            .slice(separatorIndex + 3)
            .trim();

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

      const parsedAuthors: string =
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

      const gptAuthors: string[] = [
        ...new Set([
          ...gptBookItems.map(
            (item: { title: string; author: string }) => item.author
          ),
          ...parsedAuthors
            .split(",")
            .map((a: string) => a.trim())
            .filter(Boolean),
        ]),
      ];

      const authorBooks: GoogleBooksItem[] = (
        await Promise.all(
          gptAuthors.map(async (author: string) => {
            try {
              const query: string = `inauthor:"${author}"`;
              const maxResults: number = 10;
              console.log(`Fetching books for author: ${author}`);
              const res: any = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                  query
                )}&printType=books&maxResults=${maxResults}&orderBy=relevance`
              );
              const json: any = await res.json();
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

      authorBooks.forEach((book: GoogleBooksItem) => {
        const id: string = book.id;
        const title: string = book.volumeInfo?.title;
        if (id && title && !uniqueBooksMap.has(id)) {
          uniqueBooksMap.set(id, book);
          finalBooks.push(book);
        }
      });
      // Process user's favorite genres first
      for (const genre of favoriteGenres) {
        const base: number = 40;
        const extra: number = 10;
        const total: number = base + (genreCount - 1) * extra;
        const currentYear: number = new Date().getFullYear();
        const fromYear: number = currentYear - 5;

        let searchQueries: string[] = [];
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
            const res: any = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                query
              )}&printType=books&maxResults=${Math.ceil(total / searchQueries.length)}&orderBy=relevance`
            );
            const json: any = await res.json();
            const items: GoogleBooksItem[] = json.items || [];

            console.log(`Found ${items.length} books for query: "${query}"`);

            items.forEach((book: GoogleBooksItem) => {
              const id: string = book.id;
              const title: string = book.volumeInfo?.title;
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
        const unselectedGenres: string[] = GENRES.filter(
          (genre: string) => !favoriteGenres.includes(genre)
        );
        // Randomly select 4 different genres from the remaining ones
        const randomUnselectedGenres: string[] = unselectedGenres
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);

        for (const genre of randomUnselectedGenres) {
          const searchQueries: string[] = [
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
              const res: any = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                  query
                )}&printType=books&maxResults=${maxResults}&orderBy=${orderBy}`
              );
              const json: any = await res.json();
              const items: GoogleBooksItem[] = json.items || [];

              console.log(
                `Found ${items.length} unselected genre books for query: "${query}"`
              );

              items.forEach((book: GoogleBooksItem) => {
                const id: string = book.id;
                const title: string = book.volumeInfo?.title;
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
            const res: any = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
                query
              )}&printType=books&maxResults=4&orderBy=relevance`
            );
            const json: any = await res.json();
            const items: GoogleBooksItem[] = json.items || [];

            console.log(`Found ${items.length} books for unforgettable query`);

            items.forEach((book: GoogleBooksItem) => {
              const id: string = book.id;
              const title: string = book.volumeInfo?.title;
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

      const uniqueFinalBooks: GoogleBooksItem[] = finalBooks.filter(
        (b: GoogleBooksItem, i: number, arr: GoogleBooksItem[]) =>
          arr.findIndex((x: GoogleBooksItem) => x.id === b.id) === i
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
