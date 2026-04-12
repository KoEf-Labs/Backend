import { NextRequest } from "next/server";
import crypto from "crypto";
import { verifyAccessToken, AccessTokenPayload } from "./jwt";

/**
 * Extract and verify JWT from:
 * 1. Authorization: Bearer <token> header
 * 2. ?token=<token> query parameter (for WebView which can't send headers)
 */
export function getAuthPayload(req: NextRequest): AccessTokenPayload | null {
  // Try header first
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      return verifyAccessToken(header.slice(7));
    } catch {
      return null;
    }
  }

  // Fallback: query parameter (for WebView preview)
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken && queryToken !== "null") {
    try {
      return verifyAccessToken(queryToken);
    } catch {
      return null;
    }
  }

  return null;
}

/** Get userId from JWT */
export function getUserId(req: NextRequest): string | null {
  return getAuthPayload(req)?.sub ?? null;
}

/** Require authenticated user — throws AuthError if not authenticated */
export function requireAuth(req: NextRequest): string {
  const userId = getUserId(req);
  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }
  return userId;
}

/** Require valid internal service token (for AdminBackend → Backend calls) */
export function requireServiceToken(req: NextRequest): void {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    throw new AuthError("Internal service token not configured", 500);
  }
  const provided = req.headers.get("x-service-token");
  if (!provided || !timingSafeEqualStr(provided, expected)) {
    throw new AuthError("Invalid service token", 403);
  }
}

/** Constant-time string comparison to prevent timing attacks. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
