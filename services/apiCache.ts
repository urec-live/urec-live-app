import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'api_cache_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export const apiCache = {
  /**
   * Save data to cache with a timestamp
   */
  set: async <T>(key: string, data: T): Promise<void> => {
    try {
      const entry: CacheEntry<T> = {
        timestamp: Date.now(),
        data,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to cache data for key:', key, error);
    }
  },

  /**
   * Get data from cache.
   * Returns null if not found or expired (optional expiry check can be added).
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const json = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!json) return null;

      const entry: CacheEntry<T> = JSON.parse(json);
      
      // Optional: Check expiry if strict freshness is required
      // if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      //   return null; 
      // }

      return entry.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data for key:', key, error);
      return null;
    }
  },

  /**
   * Clear a specific cache key
   */
  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Failed to remove cache key:', key, error);
    }
  }
};
