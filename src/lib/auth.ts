import { NextRequest } from "next/server";

/**
 * Auth helper placeholder.
 * TODO: Efekan — Implement JWT verification.
 *
 * Current: reads x-user-id header (mock auth)
 * Target: verify JWT token, return userId
 */
export function getUserId(req: NextRequest): string | null {
  // TODO: Replace with JWT verification
  return req.headers.get("x-user-id");
}

export function requireAuth(req: NextRequest): string {
  const userId = getUserId(req);
  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }
  return userId;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
