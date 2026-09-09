/**
 * GymSync Multi-Tier Caching Subsystem
 *
 * Architecture:
 * - L1: In-Memory Map with TTL and bounded capacity (LRU eviction) for ultra-fast <1ms local reads.
 * - L2: True Distributed Redis (via ioredis) when REDIS_URL is configured.
 * - Synchronization: Redis Pub/Sub invalidation channel ensures peer instances drop stale L1 entries.
 * - Fault Tolerance: 350ms timeout protection and automatic fallback to L1 if Redis hangs, errors, or is unreachable.
 * - Transparency: If REDIS_URL is not set, explicitly reports "local_l1_only" (never claims distributed).
 */

import crypto from 'crypto';
import Redis from 'ioredis';

const DEFAULT_TTL_SECONDS = 300;
const MAX_L1_ITEMS = 1000;
const REDIS_TIMEOUT_MS = 350;
const INVALIDATION_CHANNEL = 'gymsync:cache_invalidation';

export class MemoryCache {
  constructor(defaultTtlSeconds = DEFAULT_TTL_SECONDS, maxItems = MAX_L1_ITEMS) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.maxItems = maxItems;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU semantics
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;

    // Evict oldest if capacity exceeded
    if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  delete(key) {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    const isRegex = pattern instanceof RegExp;
    let count = 0;
    const prefix = typeof pattern === 'string' ? pattern.replace('*', '') : '';

    for (const key of Array.from(this.cache.keys())) {
      const matches = isRegex ? pattern.test(key) : key.startsWith(prefix);
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

function withTimeout(promise, timeoutMs = REDIS_TIMEOUT_MS) {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Redis operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

export class DistributedCacheService {
  constructor(options = {}) {
    this.instanceId = options.instanceId || crypto.randomUUID();
    this.l1 = new MemoryCache(options.defaultTtlSeconds || DEFAULT_TTL_SECONDS, options.maxItems || MAX_L1_ITEMS);
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || null;
    this.redis = null;
    this.subscriber = null;
    this.isDistributed = false;
    this.isConnected = false;

    if (this.redisUrl) {
      this.initRedis(options);
    } else {
      console.log('ℹ️ Cache Service: REDIS_URL not configured. Operating in Local L1 In-Memory Mode (Distributed Cache Not Configured).');
    }
  }

  initRedis(options = {}) {
    try {
      const clientConfig = {
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
        ...options.redisOptions
      };

      this.redis = options.mockRedisClient || new Redis(this.redisUrl, clientConfig);
      this.subscriber = options.mockSubscriberClient || new Redis(this.redisUrl, clientConfig);

      this.redis.on('error', (err) => {
        if (this.isConnected) {
          console.warn('[Redis Cache Client Warning]:', err.message);
        }
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.isDistributed = true;
        console.log(`✅ Distributed Cache: Connected to Redis cluster/instance [Instance ID: ${this.instanceId.slice(0, 8)}]`);
      });

      this.subscriber.on('error', () => {});
      this.subscriber.on('connect', () => {
        this.subscriber.subscribe(INVALIDATION_CHANNEL, (err) => {
          if (!err) {
            this.subscriber.on('message', (channel, message) => {
              if (channel === INVALIDATION_CHANNEL) {
                try {
                  const { pattern, senderId } = JSON.parse(message);
                  if (senderId !== this.instanceId && pattern) {
                    this.l1.invalidatePattern(pattern);
                  }
                } catch {
                  // Ignore malformed messages
                }
              }
            });
          }
        });
      });

      // Attempt async connection in background without blocking server boot
      if (typeof this.redis.connect === 'function') {
        this.redis.connect().catch(() => {});
      }
      if (typeof this.subscriber.connect === 'function') {
        this.subscriber.connect().catch(() => {});
      }
    } catch (err) {
      console.warn('⚠️ Could not initialize Redis client, falling back to L1:', err.message);
      this.isDistributed = false;
      this.isConnected = false;
    }
  }

  getMode() {
    return this.isConnected ? 'distributed_l2' : 'local_l1_only';
  }

  async get(key) {
    // 1. Check local L1 memory cache (ultra-fast <1ms)
    const l1Val = this.l1.get(key);
    if (l1Val !== null) {
      return l1Val;
    }

    // 2. Check remote Redis L2 if configured and healthy
    if (this.isConnected && this.redis) {
      try {
        const raw = await withTimeout(this.redis.get(key));
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          // Populate local L1 cache for subsequent fast reads
          this.l1.set(key, parsed);
          return parsed;
        }
      } catch (err) {
        // Fallback gracefully without breaking Express controller
        this.isConnected = false;
      }
    }

    return null;
  }

  async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    // Always populate local L1
    this.l1.set(key, value, ttlSeconds);

    // Populate remote Redis L2 if connected
    if (this.isConnected && this.redis) {
      try {
        const serialized = JSON.stringify(value);
        await withTimeout(this.redis.setex(key, ttlSeconds, serialized));
      } catch (err) {
        this.isConnected = false;
      }
    }
  }

  async delete(key) {
    this.l1.delete(key);

    if (this.isConnected && this.redis) {
      try {
        await withTimeout(this.redis.del(key));
        this.redis.publish(INVALIDATION_CHANNEL, JSON.stringify({ pattern: key, senderId: this.instanceId })).catch(() => {});
      } catch {
        this.isConnected = false;
      }
    }
  }

  async invalidatePattern(pattern) {
    const l1Count = this.l1.invalidatePattern(pattern);

    if (this.isConnected && this.redis) {
      try {
        const prefix = typeof pattern === 'string' ? pattern.replace('*', '') : '';
        const matchPattern = `${prefix}*`;

        // Non-blocking SCAN loop to delete keys from Redis
        let cursor = '0';
        do {
          const [nextCursor, keys] = await withTimeout(this.redis.scan(cursor, 'MATCH', matchPattern, 'COUNT', 100));
          cursor = nextCursor;
          if (keys && keys.length > 0) {
            await withTimeout(this.redis.del(...keys));
          }
        } while (cursor !== '0');

        // Publish cross-instance invalidation event to notify peer servers
        await withTimeout(
          this.redis.publish(
            INVALIDATION_CHANNEL,
            JSON.stringify({ pattern: typeof pattern === 'string' ? pattern : pattern.source, senderId: this.instanceId })
          )
        );
      } catch (err) {
        this.isConnected = false;
      }
    }

    return l1Count;
  }

  flushAll() {
    this.l1.flushAll();
    if (this.isConnected && this.redis) {
      this.redis.flushdb().catch(() => {});
    }
  }
}

export const apiCache = new DistributedCacheService();
export default apiCache;
