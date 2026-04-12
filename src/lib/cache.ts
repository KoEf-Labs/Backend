/**
 * Simple in-memory LRU cache with TTL.
 * Used for schema.json, theme metadata, and rendered HTML.
 * Map iteration order = insertion order, which we exploit for LRU:
 *   - get() moves the entry to the back (most recently used)
 *   - set() evicts the oldest entry (first key) when maxSize is reached
 */
export class MemoryCache<T> {
  private store = new Map<string, { data: T; expiresAt: number }>();
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlSeconds = 300, maxSize = 0) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // LRU touch: re-insert at the end
    if (this.maxSize > 0) {
      this.store.delete(key);
      this.store.set(key, entry);
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    // If already present, delete first so re-insert keeps LRU order consistent
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
    // Evict oldest until under maxSize
    if (this.maxSize > 0 && this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
