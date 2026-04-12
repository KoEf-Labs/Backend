import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { redis, isRedisAvailable } from "@/src/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface HealthCheck {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: "up" | "down"; latencyMs?: number; error?: string };
    redis: { status: "up" | "down" | "disabled"; latencyMs?: number; error?: string };
  };
}

async function checkDatabase(): Promise<HealthCheck["checks"]["database"]> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up", latencyMs: Date.now() - start };
  } catch (e) {
    return {
      status: "down",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

async function checkRedis(): Promise<HealthCheck["checks"]["redis"]> {
  if (!redis) return { status: "disabled" };
  if (!isRedisAvailable()) return { status: "down", error: "not ready" };

  const start = Date.now();
  try {
    await redis.ping();
    return { status: "up", latencyMs: Date.now() - start };
  } catch (e) {
    return {
      status: "down",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export async function GET() {
  const [database, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);

  const dbOk = database.status === "up";
  const redisOk = redisCheck.status === "up" || redisCheck.status === "disabled";

  let status: HealthCheck["status"];
  if (dbOk && redisOk) status = "ok";
  else if (dbOk) status = "degraded";
  else status = "down";

  const body: HealthCheck = {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: { database, redis: redisCheck },
  };

  return NextResponse.json(body, {
    status: status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
