import Redis from "ioredis";
import { logger } from "./logger";

/**
 * Redis client.
 * Falls back gracefully if REDIS_URL is not set (dev mode).
 */
let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on("connect", () => logger.info("Redis connected"));
  redis.on("error", (err) => logger.error("Redis error", { error: err.message }));

  redis.connect().catch(() => {
    logger.warn("Redis connection failed — falling back to in-memory");
    redis = null;
  });
}

export { redis };

export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === "ready";
}
