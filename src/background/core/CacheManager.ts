/**
 * In-memory LRU cache with time-based expiration.
 */

export interface CacheEntry {
  value: unknown;
  expiresAt: number;
  lastAccessed: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = DEFAULT_MAX_SIZE, defaultTTL: number = DEFAULT_TTL_MS) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Store a value with an optional TTL. Evicts the least-recently-used entry when at capacity.
   */
  set(key: string, value: unknown, ttl?: number): void {
    // Evict if at capacity and key is new
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTTL),
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Retrieve a cached value. Returns null if the key is missing or expired.
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = Date.now();
    return entry.value as T;
  }

  /**
   * Check whether a non-expired entry exists for the given key.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Remove a single entry from the cache.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Return the number of non-expired entries.
   */
  size(): number {
    this.pruneExpired();
    return this.cache.size;
  }

  /**
   * Generate a deterministic cache key from multiple string parts.
   * Uses the joined parts directly to avoid hash collisions.
   */
  generateKey(...parts: string[]): string {
    return `cache:${parts.join(':')}`;
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
