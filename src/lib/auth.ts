import { NextRequest } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "./jwt";

/**
 * Extract and verify JWT from Authorization header.
 * Returns the decoded payload or null.
 */
export function getAuthPayload(req: NextRequest): AccessTokenPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
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

/** Require ADMIN role */
export function requireAdmin(req: NextRequest): string {
  const payload = getAuthPayload(req);
  if (!payload) {
    throw new AuthError("Authentication required", 401);
  }
  if (payload.role !== "ADMIN") {
    throw new AuthError("Admin access required", 403);
  }
  return payload.sub;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
