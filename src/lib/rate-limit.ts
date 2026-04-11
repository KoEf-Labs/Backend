/**
 * Rate limiter — Redis-backed with in-memory fallback.
 */
import { redis, isRedisAvailable } from "./redis";

const WINDOW_SECONDS = 60; // 1 minute

// In-memory fallback store
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit. Returns true if blocked.
 * Redis: uses INCR + EXPIRE (atomic sliding window)
 * Memory: simple counter fallback
 */
async function checkLimit(key: string, max: number): Promise<boolean> {
  if (isRedisAvailable() && redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }
      return count > max;
    } catch {
      // Redis error — fall through to memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return false;
  }

  entry.count++;
  return entry.count > max;
}

/** Auth endpoints: 5/min per IP */
export function isRateLimited(key: string): Promise<boolean> {
  return checkLimit(`rl:auth:${key}`, 5);
}

/** Render/upload endpoints: 10/min per IP */
export function isRenderRateLimited(key: string): Promise<boolean> {
  return checkLimit(`rl:heavy:${key}`, 10);
}

/**
 * Get client IP from request.
 * Only trusts X-Forwarded-For when TRUST_PROXY=true (behind reverse proxy).
 */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (trustProxy) {
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  }

  return req.headers.get("x-real-ip") || "unknown";
}

// Memory cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
      if (now > entry.resetAt) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}
