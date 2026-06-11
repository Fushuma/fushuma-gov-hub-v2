/**
 * Small key-value abstraction used for nonces and rate limiting.
 *
 * Uses Redis when REDIS_URL is configured (required for multi-instance
 * deployments so state is shared between processes), and falls back to
 * an in-memory store for local development.
 */

import Redis from "ioredis";

interface KVStore {
  get(key: string): Promise<string | null>;
  /** Set a value with a TTL in milliseconds. */
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Atomically increment a counter, setting the TTL on first increment. Returns the new count. */
  incr(key: string, ttlMs: number): Promise<number>;
}

class MemoryStore implements KVStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (this.store.size > 10_000) this.prune();
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string, ttlMs: number): Promise<number> {
    const current = await this.get(key);
    const next = current ? parseInt(current, 10) + 1 : 1;
    const entry = this.store.get(key);
    // Preserve the original window expiry; only set TTL on first increment
    const expiresAt = entry ? entry.expiresAt : Date.now() + ttlMs;
    this.store.set(key, { value: String(next), expiresAt });
    return next;
  }
}

class RedisStore implements KVStore {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(key, value, "PX", ttlMs);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async incr(key: string, ttlMs: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.pexpire(key, ttlMs);
    }
    return count;
  }
}

function createStore(): KVStore {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redis = new Redis(redisUrl, {
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
    redis.on("error", (err) => {
      console.error("[kv] Redis error:", err.message);
    });
    return new RedisStore(redis);
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[kv] REDIS_URL is not set - nonces and rate limits are stored in memory. " +
        "This only works with a single server process."
    );
  }
  return new MemoryStore();
}

export const kv: KVStore = createStore();
