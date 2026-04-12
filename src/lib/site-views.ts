/**
 * Per-project site view counter.
 *
 * Writes:
 *   /api/site/live + /api/site/preview/[id] → trackView(projectId, ip)
 *
 * Increments two Redis keys per day per project:
 *   views:count:{yyyy-mm-dd}:{projectId}    → INCR, TTL 3 days
 *   views:ips:{yyyy-mm-dd}:{projectId}      → SADD ip, TTL 3 days
 *
 * A daily cron (scripts/aggregate-site-views.ts) reads these keys,
 * writes rolled-up rows into Project.SiteView, and deletes the raw keys.
 *
 * Falls back to a no-op when Redis isn't available so the render path
 * isn't blocked by analytics.
 */
import { redis, isRedisAvailable } from "./redis";
import { logger } from "./logger";

const KEY_TTL_SECONDS = 3 * 24 * 60 * 60; // 3 days — cron reaps faster than this

function todayKey(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function viewCountKey(date: string, projectId: string): string {
  return `views:count:${date}:${projectId}`;
}

export function viewIpsKey(date: string, projectId: string): string {
  return `views:ips:${date}:${projectId}`;
}

export async function trackView(projectId: string, ip: string | null): Promise<void> {
  if (!redis || !isRedisAvailable()) return;
  const date = todayKey();
  const countKey = viewCountKey(date, projectId);
  const ipsKey = viewIpsKey(date, projectId);

  try {
    // Pipeline: fewer round trips
    const pipe = redis.pipeline();
    pipe.incr(countKey);
    pipe.expire(countKey, KEY_TTL_SECONDS);
    if (ip) {
      pipe.sadd(ipsKey, ip);
      pipe.expire(ipsKey, KEY_TTL_SECONDS);
    }
    await pipe.exec();
  } catch (e) {
    // Don't block the render path if analytics fails
    logger.warn("site_view_track_failed", {
      projectId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Discover all (date, projectId) combinations currently held in Redis.
 * Used by the aggregator cron. Returns paired count/ips lookups.
 */
export async function listPendingViewKeys(): Promise<
  Array<{ date: string; projectId: string }>
> {
  if (!redis || !isRedisAvailable()) return [];
  try {
    const keys = await redis.keys("views:count:*");
    return keys
      .map((k) => {
        // views:count:YYYY-MM-DD:projectId
        const parts = k.split(":");
        if (parts.length < 4) return null;
        const date = parts[2];
        const projectId = parts.slice(3).join(":");
        return { date, projectId };
      })
      .filter((x): x is { date: string; projectId: string } => x !== null);
  } catch (e) {
    logger.error("site_view_list_keys_failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

/**
 * Read + delete a single day's counters for a project.
 * Returns the counts so the caller can write a SiteView row.
 */
export async function drainViewCounter(
  date: string,
  projectId: string
): Promise<{ count: number; uniqueIps: number } | null> {
  if (!redis || !isRedisAvailable()) return null;
  const countKey = viewCountKey(date, projectId);
  const ipsKey = viewIpsKey(date, projectId);

  try {
    const count = Number((await redis.get(countKey)) || 0);
    const uniqueIps = Number((await redis.scard(ipsKey)) || 0);
    // Delete after reading so cron reruns don't double-count
    await redis.del(countKey, ipsKey);
    return { count, uniqueIps };
  } catch (e) {
    logger.error("site_view_drain_failed", {
      date,
      projectId,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
