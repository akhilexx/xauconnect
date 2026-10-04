/**
 * Cache layer — Redis when REDIS_URL is set, otherwise an in-memory store.
 * Used for quote caching, market data TTLs, auth nonces and rate limiting.
 */
import { Redis } from "ioredis";
import { env } from "./config.js";
import { logger } from "./logger.js";

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Atomic increment returning the new value; sets TTL on first hit. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

class MemoryCache implements Cache {
  private store = new Map<string, { value: string; expiresAt: number }>();

  private sweep() {
    if (this.store.size < 10_000) return;
    const now = Date.now();
    for (const [k, v] of this.store) if (v.expiresAt < now) this.store.delete(k);
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 3600) {
    this.sweep();
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const current = Number((await this.get(key)) ?? "0") + 1;
    const existing = this.store.get(key);
    this.store.set(key, {
      value: String(current),
      expiresAt: existing ? existing.expiresAt : Date.now() + ttlSeconds * 1000,
    });
    return current;
  }
}

class RedisCache implements Cache {
  constructor(private redis: Redis) {}

  async get(key: string) {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds = 3600) {
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const value = await this.redis.incr(key);
    if (value === 1) await this.redis.expire(key, ttlSeconds);
    return value;
  }
}

function createCache(): Cache {
  if (env.REDIS_URL) {
    try {
      const redis = new Redis(env.REDIS_URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });
      redis.on("error", (err) => logger.warn({ err: err.message }, "redis error"));
      logger.info("cache: redis");
      return new RedisCache(redis);
    } catch (err) {
      logger.warn({ err }, "redis unavailable — falling back to memory cache");
    }
  } else {
    logger.info("cache: in-memory (set REDIS_URL for production)");
  }
  return new MemoryCache();
}

export const cache = createCache();

/** JSON convenience wrapper with TTL. */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cache.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await loader();
  await cache.set(key, JSON.stringify(value), ttlSeconds);
  return value;
}
