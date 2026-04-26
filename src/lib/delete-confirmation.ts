/**
 * Delete confirmation code store. Two purposes share this file:
 *   - Project deletion (project ID as the key, "del:" prefix).
 *   - Account deletion (user ID as the key, "del:account:" prefix).
 *
 * Writes go to BOTH redis (when ready) and the in-memory map; reads
 * prefer redis but fall back to memory. The dual-write is needed
 * because Redis uses lazyConnect — a request-delete call that fires
 * before the first connect resolves writes only to memory, and the
 * subsequent DELETE request (after Redis became ready) would otherwise
 * miss the code entirely. Hot reload in dev clears the memory map, so
 * Redis is still the source of truth in long-lived deployments.
 */
import { redis, isRedisAvailable } from "./redis";

const TTL_SECONDS = 600; // 10 minutes
const PROJECT_PREFIX = "del:";
const ACCOUNT_PREFIX = "del:account:";

const memoryStore = new Map<string, { code: string; userId: string; expiresAt: number }>();

async function setCode(
  prefix: string,
  key: string,
  userId: string,
  code: string,
): Promise<void> {
  memoryStore.set(prefix + key, {
    code,
    userId,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  });
  if (isRedisAvailable() && redis) {
    try {
      await redis.setex(
        prefix + key,
        TTL_SECONDS,
        JSON.stringify({ code, userId }),
      );
    } catch {
      // Memory copy already saved — request can still complete.
    }
  }
}

async function getCode(
  prefix: string,
  key: string,
): Promise<{ code: string; userId: string } | null> {
  if (isRedisAvailable() && redis) {
    try {
      const data = await redis.get(prefix + key);
      if (data) return JSON.parse(data);
    } catch {
      // fall through to memory
    }
  }
  const entry = memoryStore.get(prefix + key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(prefix + key);
    return null;
  }
  return { code: entry.code, userId: entry.userId };
}

async function clearCode(prefix: string, key: string): Promise<void> {
  memoryStore.delete(prefix + key);
  if (isRedisAvailable() && redis) {
    try {
      await redis.del(prefix + key);
    } catch {
      // ignore
    }
  }
}

// ── Project deletion ────────────────────────────────────────────────

export const setDeleteCode = (projectId: string, userId: string, code: string) =>
  setCode(PROJECT_PREFIX, projectId, userId, code);

export const getDeleteCode = (projectId: string) =>
  getCode(PROJECT_PREFIX, projectId);

export const clearDeleteCode = (projectId: string) =>
  clearCode(PROJECT_PREFIX, projectId);

// ── Account deletion ────────────────────────────────────────────────

export const setAccountDeleteCode = (userId: string, code: string) =>
  setCode(ACCOUNT_PREFIX, userId, userId, code);

export const getAccountDeleteCode = (userId: string) =>
  getCode(ACCOUNT_PREFIX, userId);

export const clearAccountDeleteCode = (userId: string) =>
  clearCode(ACCOUNT_PREFIX, userId);

// ── Password change ─────────────────────────────────────────────────

const PWD_CHANGE_PREFIX = "pwd:change:";

export const setPasswordChangeCode = (userId: string, code: string) =>
  setCode(PWD_CHANGE_PREFIX, userId, userId, code);

export const getPasswordChangeCode = (userId: string) =>
  getCode(PWD_CHANGE_PREFIX, userId);

export const clearPasswordChangeCode = (userId: string) =>
  clearCode(PWD_CHANGE_PREFIX, userId);
