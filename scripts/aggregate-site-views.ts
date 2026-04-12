/**
 * Daily SiteView aggregator.
 *
 * Reads per-day Redis counters populated by lib/site-views.ts,
 * upserts one SiteView row per (projectId, date), and deletes the
 * raw keys.
 *
 * Run via PM2 cron (ecosystem.config.js) — see "aggregate-site-views"
 * process, scheduled for 04:00 UTC every day.
 *
 * Manual run:
 *   cd Backend && npx tsx scripts/aggregate-site-views.ts
 */
import { PrismaClient } from "@prisma/client";
import { listPendingViewKeys, drainViewCounter } from "@/src/lib/site-views";
import { redis } from "@/src/lib/redis";

const prisma = new PrismaClient();

/**
 * Wait for Redis to reach "ready" state so listPendingViewKeys doesn't
 * silently return [] during the lazyConnect handshake. Caps at 5s so a
 * genuinely-down Redis still lets the cron exit cleanly.
 */
async function waitForRedis(timeoutMs = 5000): Promise<boolean> {
  if (!redis) return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const pong = await redis.ping();
      if (pong === "PONG") return true;
    } catch {
      // not ready yet — retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function main() {
  const started = Date.now();

  const redisReady = await waitForRedis();
  if (!redisReady) {
    console.log(
      JSON.stringify({
        level: "warn",
        message: "aggregate-site-views",
        timestamp: new Date().toISOString(),
        error: "redis_unavailable",
      })
    );
    return;
  }

  const pending = await listPendingViewKeys();

  if (pending.length === 0) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "aggregate-site-views",
        timestamp: new Date().toISOString(),
        pending: 0,
      })
    );
    return;
  }

  // Group by (date, projectId) — listPendingViewKeys already returns unique pairs
  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const { date, projectId } of pending) {
    const drained = await drainViewCounter(date, projectId);
    if (!drained || drained.count === 0) {
      skipped++;
      continue;
    }

    // Check project still exists (soft delete OK — we still want the counter)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      skipped++;
      continue;
    }

    try {
      await prisma.siteView.upsert({
        where: {
          projectId_date: {
            projectId,
            date: new Date(date + "T00:00:00.000Z"),
          },
        },
        create: {
          projectId,
          date: new Date(date + "T00:00:00.000Z"),
          count: drained.count,
          uniqueIps: drained.uniqueIps,
        },
        update: {
          count: { increment: drained.count },
          // unique IPs can't be strictly summed — take the max as a floor
          uniqueIps: drained.uniqueIps,
        },
      });
      written++;
    } catch (e) {
      failed++;
      console.error(
        JSON.stringify({
          level: "error",
          message: "aggregate_site_views_upsert_failed",
          projectId,
          date,
          error: e instanceof Error ? e.message : String(e),
        })
      );
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      message: "aggregate-site-views",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      pending: pending.length,
      written,
      skipped,
      failed,
    })
  );
}

main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "aggregate-site-views failed",
        timestamp: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
      })
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
