/**
 * In-Memory TTL Cache with Pattern-based Invalidation
 *
 * Designed for low-latency retrieval of semi-static content
 * (published workout programs, diet templates, educational articles, and exercises)
 * while maintaining instant cache invalidation upon instructor/admin mutations.
 */

class MemoryCache {
  constructor(defaultTtlSeconds = 300) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex pattern
   * E.g. invalidatePattern('plans:*') or invalidatePattern('articles:*')
   */
  invalidatePattern(pattern) {
    const isRegex = pattern instanceof RegExp;
    let count = 0;

    for (const key of this.cache.keys()) {
      const matches = isRegex ? pattern.test(key) : key.startsWith(pattern.replace('*', ''));
      if (matches) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  flushAll() {
    return this.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const apiCache = new MemoryCache(300); // 5-minute default TTL
export default apiCache;
