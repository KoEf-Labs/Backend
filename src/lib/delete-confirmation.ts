/**
 * Delete confirmation code store.
 * Redis-backed with in-memory fallback.
 */
import { redis, isRedisAvailable } from "./redis";

const TTL_SECONDS = 600; // 10 minutes
const PREFIX = "del:";

// In-memory fallback
const memoryStore = new Map<string, { code: string; userId: string; expiresAt: number }>();

export async function setDeleteCode(projectId: string, userId: string, code: string): Promise<void> {
  if (isRedisAvailable() && redis) {
    await redis.setex(`${PREFIX}${projectId}`, TTL_SECONDS, JSON.stringify({ code, userId }));
    return;
  }
  memoryStore.set(projectId, { code, userId, expiresAt: Date.now() + TTL_SECONDS * 1000 });
}

export async function getDeleteCode(projectId: string): Promise<{ code: string; userId: string } | null> {
  if (isRedisAvailable() && redis) {
    const data = await redis.get(`${PREFIX}${projectId}`);
    if (!data) return null;
    return JSON.parse(data);
  }
  const entry = memoryStore.get(projectId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(projectId);
    return null;
  }
  return { code: entry.code, userId: entry.userId };
}

export async function clearDeleteCode(projectId: string): Promise<void> {
  if (isRedisAvailable() && redis) {
    await redis.del(`${PREFIX}${projectId}`);
    return;
  }
  memoryStore.delete(projectId);
}
