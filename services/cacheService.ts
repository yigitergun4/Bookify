import AsyncStorage from "@react-native-async-storage/async-storage";
import ENV from "../config/env";

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem<any>> = new Map();

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
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
          // Update memory cache
          this.cache.set(key, parsedItem);
          return parsedItem.data;
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
}
