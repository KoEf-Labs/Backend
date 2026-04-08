/**
 * Redis client.
 *
 * Currently null — using in-memory alternatives for cache and rate limiting.
 * When ready for production:
 * 1. npm install ioredis
 * 2. Set REDIS_URL in .env
 * 3. Uncomment the client below
 * 4. Swap MemoryCache → RedisCache in theme.service.ts, schema.service.ts, render.service.ts
 * 5. Swap in-memory rate limiter → Redis-backed in rate-limit.ts
 */

// import Redis from "ioredis";
//
// export const redis = process.env.REDIS_URL
//   ? new Redis(process.env.REDIS_URL)
//   : null;

export const redis = null;

/**
 * Check if Redis is available.
 * Use this to gracefully fall back to in-memory when Redis isn't configured.
 */
export function isRedisAvailable(): boolean {
  return redis !== null;
}
