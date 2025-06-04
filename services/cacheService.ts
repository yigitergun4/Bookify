import AsyncStorage from "@react-native-async-storage/async-storage";
import ENV from "../config/env";

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface BookClick {
  bookInfo: any; // all book information
  clickDate: number;
  userId: string;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupThreshold: number = 100;
  private readonly RECENT_CLICKS_KEY = "recent_book_clicks";
  private readonly MAX_RECENT_CLICKS = 20;
  private recentClicksSubscribers: ((clicks: BookClick[]) => void)[] = [];
  private RECOMMENDED_BOOKS_KEY = "recommended_books";

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // find expired items in memory cache
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > ENV.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }

    // delete expired items
    for (const key of expiredKeys) {
      this.cache.delete(key);
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        console.error("Cache cleanup error:", error);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache items`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const cachedItem = this.cache.get(key);
    if (cachedItem && !this.isExpired(cachedItem.timestamp)) {
      return cachedItem.data;
    }

    // Check AsyncStorage
    try {
      const storedItem = await AsyncStorage.getItem(key);
      if (storedItem) {
        const parsedItem: CacheItem<T> = JSON.parse(storedItem);
        if (!this.isExpired(parsedItem.timestamp)) {
          this.cache.set(key, parsedItem);
          return parsedItem.data;
        } else {
          await this.delete(key);
        }
      }
    } catch (error) {
      console.error("Cache read error:", error);
    }

    return null;
  }

  async set<T>(key: string, data: T): Promise<void> {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };

    // Update memory cache
    this.cache.set(key, cacheItem);

    // Update AsyncStorage
    try {
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));

      // if cleanupThreshold is reached, cleanup expired items
      if (this.cache.size % this.cleanupThreshold === 0) {
        await this.cleanupExpiredItems();
      }
    } catch (error) {
      console.error("Cache write error:", error);
    }
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > ENV.CACHE_DURATION;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  subscribeToRecentClicks(callback: (clicks: BookClick[]) => void) {
    this.recentClicksSubscribers.push(callback);
    return () => {
      this.recentClicksSubscribers = this.recentClicksSubscribers.filter(
        (sub) => sub !== callback
      );
    };
  }

  private notifyRecentClicksSubscribers(clicks: BookClick[]) {
    this.recentClicksSubscribers.forEach((callback) => callback(clicks));
  }

  async addBookClick(book: any, userId: string) {
    try {
      const clicks = await this.getRecentClicks(userId);
      const newClick: BookClick = {
        bookInfo: book,
        clickDate: Date.now(),
        userId: userId,
      };

      // if same book exists, update the date
      const existingIndex = clicks.findIndex(
        (click) => click.bookInfo.id === book.id
      );
      if (existingIndex !== -1) {
        clicks[existingIndex] = newClick;
      } else {
        clicks.unshift(newClick);
      }

      // check if the maximum number of clicks is reached
      if (clicks.length > this.MAX_RECENT_CLICKS) {
        clicks.pop();
      }

      await AsyncStorage.setItem(
        `${this.RECENT_CLICKS_KEY}_${userId}`,
        JSON.stringify(clicks)
      );
      this.notifyRecentClicksSubscribers(clicks);
    } catch (error) {
      console.error("Error adding book click:", error);
    }
  }

  async getRecentClicks(userId: string): Promise<BookClick[]> {
    try {
      const clicks = await AsyncStorage.getItem(
        `${this.RECENT_CLICKS_KEY}_${userId}`
      );
      if (clicks) {
        return JSON.parse(clicks);
      }
      return [];
    } catch (error) {
      console.error("Error getting recent clicks:", error);
      return [];
    }
  }

  async clearRecentClicks(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.RECENT_CLICKS_KEY}_${userId}`);
    } catch (error) {
      console.error("Error clearing recent clicks:", error);
    }
  }

  async saveRecommendedBooks(userId: string, books: any[]): Promise<void> {
    try {
      const key = `${this.RECOMMENDED_BOOKS_KEY}_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(books));
    } catch (error) {
      console.log("Error saving recommended books:", error);
    }
  }

  async getRecommendedBooks(userId: string): Promise<any[]> {
    try {
      const key = `${this.RECOMMENDED_BOOKS_KEY}_${userId}`;
      const books = await AsyncStorage.getItem(key);
      return books ? JSON.parse(books) : [];
    } catch (error) {
      console.error("Error getting recommended books:", error);
      return [];
    }
  }
}
