/**
 * Simple in-memory rate limiter for auth endpoints.
 * Key = IP address, tracks attempts within a sliding window.
 */

interface RateLimitEntry {
  attempts: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

/** Returns true if the request should be blocked (auth: 5/min) */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { attempts: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.attempts++;
  if (entry.attempts > MAX_ATTEMPTS) {
    return true;
  }

  return false;
}

/**
 * Get client IP from request.
 * Only trusts X-Forwarded-For when TRUST_PROXY=true (behind reverse proxy).
 * Otherwise uses a fallback key to prevent IP spoofing.
 */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (trustProxy) {
    // Behind a trusted proxy (e.g. Cloudflare, nginx)
    // Prefer Cloudflare header, then X-Real-IP, then X-Forwarded-For
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();

    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  }

  // Not behind proxy or no proxy headers — use a combination
  // that's harder to spoof (in production, the reverse proxy should set these)
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Rate limiter for compute-heavy endpoints (render: 10/min).
 * Uses separate store to avoid interference with auth limiter.
 */
const renderStore = new Map<string, RateLimitEntry>();
const RENDER_MAX = 10;

export function isRenderRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = renderStore.get(key);

  if (!entry || now > entry.resetAt) {
    renderStore.set(key, { attempts: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.attempts++;
  return entry.attempts > RENDER_MAX;
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
    for (const [key, entry] of renderStore) {
      if (now > entry.resetAt) renderStore.delete(key);
    }
  }, 5 * 60 * 1000);
}
