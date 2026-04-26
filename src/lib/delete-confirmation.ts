/**
 * Delete confirmation code store.
 * Writes to BOTH redis (when ready) and the in-memory map; reads
 * prefer redis but fall back to memory. The dual-write is needed
 * because Redis uses lazyConnect — a `request-delete` call that fires
 * before the first connect resolves writes only to memory, and the
 * subsequent DELETE request (after Redis became ready) would otherwise
 * miss the code entirely. Hot reload in dev clears the memory map, so
 * Redis is still the source of truth in long-lived deployments.
 */
import { redis, isRedisAvailable } from "./redis";

const TTL_SECONDS = 600; // 10 minutes
const PREFIX = "del:";

const memoryStore = new Map<string, { code: string; userId: string; expiresAt: number }>();

export async function setDeleteCode(
  projectId: string,
  userId: string,
  code: string,
): Promise<void> {
  memoryStore.set(projectId, {
    code,
    userId,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
  if (isRedisAvailable() && redis) {
    try {
      await redis.setex(
        `${PREFIX}${projectId}`,
        TTL_SECONDS,
        JSON.stringify({ code, userId }),
      );
    } catch {
      // Memory copy already saved — request can still complete.
    }
  }
}

export async function getDeleteCode(
  projectId: string,
): Promise<{ code: string; userId: string } | null> {
  if (isRedisAvailable() && redis) {
    try {
      const data = await redis.get(`${PREFIX}${projectId}`);
      if (data) return JSON.parse(data);
    } catch {
      // fall through to memory
    }
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
  memoryStore.delete(projectId);
  if (isRedisAvailable() && redis) {
    try {
      await redis.del(`${PREFIX}${projectId}`);
    } catch {
      // ignore
    }
  }
}
