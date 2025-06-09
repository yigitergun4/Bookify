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

  async searchBooksWithQuery(query: string): Promise<GoogleBooksItem[]> {
    try {
      console.log("🔍 Searching books with query:", query);
      const maxResultsPerPage: number = 20;
      const orderBy: string = "relevance";

      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&printType=books&maxResults=${maxResultsPerPage}&orderBy=${orderBy}`;

      console.log("🌐 API URL:", url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.items) {
        console.log("ℹ️ No books found for query:", query);
        return [];
      }

      console.log(`✅ Found ${data.items.length} books for query:`, query);
      return data.items;
    } catch (error) {
      console.error("❌ [RecommendationService] Error searching books:", {
        query,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  }

  async getPersonalizedRecommendations(
    userId: string,
    userPreferences?: {
      favoriteGenres?: string[];
      favoriteBooks?: any[];
      readBooks?: any[];
      libraryBooks?: any[];
      userGoal?: UserGoal[];
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
    favoriteBooks: string[],
    libraryBooks: GoogleBooksItem[],
    favoriteAuthors: string,
    unforgettableBook: string,
    userGoal?: UserGoal
  ): Promise<string[]> {
    const libraryTitles = libraryBooks.map(
      (book) => book.volumeInfo?.title || ""
    );

    const prompt = `I need book search queries for the Google Books API based on the following preferences:
  - Favorite genres: ${favoriteGenres.join(", ")}
  - Favorite books: ${favoriteBooks.join(", ")}
  - Favorite authors: ${favoriteAuthors}
  - Unforgettable book: ${unforgettableBook}
  - User goal: ${userGoal?.title || "None"}
  
  Generate exactly 5 concise and creative search queries (no explanations) that help discover new books aligned with these preferences.
  Avoid mentioning books with these titles: ${libraryTitles.join(", ")}
  
  Format: One query per line, no numbering.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a book recommendation expert. Generate specific search queries to use with Google Books API.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        frequency_penalty: userGoal?.id === "authors" ? 0.1 : 0.25,
        presence_penalty: userGoal?.id === "genres" ? 0.8 : 0.25,
        max_tokens: 300,
      });

      const queries = response.choices[0]?.message?.content
        ?.split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 5);

      if (!queries || queries.length === 0)
        throw new Error("No queries returned from ChatGPT.");

      console.log("📌 GPT Search Queries:", queries);
      return queries;
    } catch (error) {
      console.error("Error generating ChatGPT search queries:", error);
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

    console.log("Generated prompt:", prompt);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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
        console.log("\n🔍 Processing line:", line);

        // 1. Baştaki numara ve fancy tırnak/dash karakterlerini temizle
        const normalizedLine = line
          .replace(/^\d+[\.\)\-–—\s]*/, "") // 1. 2) 3- gibi başları sil
          .replace(/[""„"]/g, '"') // fancy tırnakları düzelt
          .replace(/[–—]/g, "-"); // tüm tireleri "-" yap

        console.log("📝 Normalized line:", normalizedLine);

        // 2. İlk görülen " - " ile parçala (kitap adı – yazar)
        const separatorIndex = normalizedLine.indexOf(" - ");
        if (separatorIndex !== -1) {
          const rawTitle = normalizedLine
            .slice(0, separatorIndex)
            .trim()
            .replace(/^"|"$/g, "");
          const rawAuthor = normalizedLine.slice(separatorIndex + 3).trim();

          console.log("📚 Title:", rawTitle);
          console.log("✍️ Author:", rawAuthor);

          if (rawTitle && rawAuthor) {
            gptBookItems.push({ title: rawTitle, author: rawAuthor });
            console.log("✅ Successfully added book");
          } else {
            console.warn("⚠️ Missing title or author");
          }
        } else {
          console.warn("❌ Cannot parse line - no separator found");
        }
      });

      console.log("\n📚 Final gptBookItems:", gptBookItems);

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
                const maxPerPage: number = 20; // Fixed number of books per author
                const res: any = await fetch(
                  `https://www.googleapis.com/books/v1/volumes?q=inauthor:${encodeURIComponent(author)}&printType=books&maxResults=${maxPerPage}&orderBy=${orderBy}`
                );
                const json: any = await res.json();
                return json.items || [];
              } catch (error) {
                console.error(
                  "Error fetching books for author:",
                  author,
                  error
                );
                return [];
              }
            })
          )
        ).flat();

        // If not enough books from authors, get from genre keywords
        let genreBooks: GoogleBooksItem[] = authorBooks;
        const minBooks: number = genreCount === 1 ? 50 : genreCount * 50;
        console.log(minBooks, "minBooks");
        console.log(authorBooks.length, "authorBooks.length");
        console.log(genreCount, "genreCount");
        if (authorBooks.length < minBooks / genreCount) {
          const keywordQuery: string = `bestseller ${genre} books in ${selectedCountry} `;
          const maxResultsPerPage: number = 40; // Results per page

          const orderBy: string = "relevance";
          console.log(
            "Fetching books for genre keyword:",
            keywordQuery,
            "page:"
          );
          const res: any = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keywordQuery)}&printType=books&maxResults=${maxResultsPerPage}&orderBy=${orderBy}`
          );
          const json: any = await res.json();
          genreBooks = [...genreBooks, ...(json.items || [])];
          console.log("genreBooks", genreBooks);
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

      lines?.forEach((line: string) => {
        const match: string[] | null = line.match(
          /^(?:\d+\.\s*)?(.*?)\s*[-]\s*(.*)$/
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
    } catch (error) {
      console.error("Error getting popular books:", error);
      return [];
    }
  }
}
