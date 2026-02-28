import { describe, it, expect, vi, beforeEach } from "vitest";
import { CacheManager } from "~background/core/CacheManager";

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager(5, 60_000); // capacity 5, TTL 60s
  });

  // ── set / get ─────────────────────────────────────────────────────

  it("stores and retrieves values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("stores different value types", () => {
    cache.set("num", 42);
    cache.set("obj", { a: 1 });
    cache.set("arr", [1, 2, 3]);

    expect(cache.get("num")).toBe(42);
    expect(cache.get("obj")).toEqual({ a: 1 });
    expect(cache.get("arr")).toEqual([1, 2, 3]);
  });

  // ── expiration ────────────────────────────────────────────────────

  it("returns null for expired entries", () => {
    cache.set("expiring", "data", 1); // 1ms TTL

    // Simulate time passing by overriding Date.now
    const originalNow = Date.now;
    Date.now = () => originalNow() + 100;

    expect(cache.get("expiring")).toBeNull();

    Date.now = originalNow;
  });

  // ── has ───────────────────────────────────────────────────────────

  it("has returns true for existing non-expired entries", () => {
    cache.set("key", "val");
    expect(cache.has("key")).toBe(true);
  });

  it("has returns false for missing keys", () => {
    expect(cache.has("nonexistent")).toBe(false);
  });

  it("has returns false for expired entries", () => {
    cache.set("exp", "val", 1);

    const originalNow = Date.now;
    Date.now = () => originalNow() + 100;

    expect(cache.has("exp")).toBe(false);

    Date.now = originalNow;
  });

  // ── delete ────────────────────────────────────────────────────────

  it("delete removes entries", () => {
    cache.set("key", "val");
    expect(cache.get("key")).toBe("val");

    cache.delete("key");
    expect(cache.get("key")).toBeNull();
  });

  // ── clear ─────────────────────────────────────────────────────────

  it("clear empties the cache", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();

    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
    expect(cache.size()).toBe(0);
  });

  // ── size ──────────────────────────────────────────────────────────

  it("size returns count of non-expired entries", () => {
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
  });

  it("size excludes expired entries", () => {
    cache.set("alive", "yes", 60_000);
    cache.set("dead", "no", 1);

    const originalNow = Date.now;
    Date.now = () => originalNow() + 100;

    expect(cache.size()).toBe(1);

    Date.now = originalNow;
  });

  // ── LRU eviction ──────────────────────────────────────────────────

  it("evicts least-recently-used entry when at capacity", () => {
    const originalNow = Date.now;
    let fakeTime = originalNow();

    // Override Date.now so each set/get gets a distinct timestamp
    Date.now = () => fakeTime;

    cache.set("a", 1); fakeTime += 10;
    cache.set("b", 2); fakeTime += 10;
    cache.set("c", 3); fakeTime += 10;
    cache.set("d", 4); fakeTime += 10;
    cache.set("e", 5); fakeTime += 10;

    // Access "a" to make it recently used
    cache.get("a"); fakeTime += 10;

    // Add a new entry — should evict "b" (least-recently-used)
    cache.set("f", 6);

    expect(cache.get("a")).toBe(1); // still present (was accessed)
    expect(cache.get("b")).toBeNull(); // evicted
    expect(cache.get("f")).toBe(6); // new entry
    expect(cache.size()).toBe(5);   // still at capacity

    Date.now = originalNow;
  });

  // ── generateKey ───────────────────────────────────────────────────

  it("generates consistent keys from parts", () => {
    const key1 = cache.generateKey("vision", "detect", "screenshot1");
    const key2 = cache.generateKey("vision", "detect", "screenshot1");
    expect(key1).toBe(key2);
    expect(key1).toBe("cache:vision:detect:screenshot1");
  });

  it("generates different keys for different parts", () => {
    const key1 = cache.generateKey("a", "b");
    const key2 = cache.generateKey("a", "c");
    expect(key1).not.toBe(key2);
  });
});
