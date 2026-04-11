import jwt from "jsonwebtoken";
import crypto from "crypto";

const privateKey = (process.env.JWT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const publicKey = (process.env.JWT_PUBLIC_KEY ?? "").replace(/\\n/g, "\n");

// Validate keys on startup
if (!privateKey || !privateKey.includes("BEGIN")) {
  console.error("⚠️  JWT_PRIVATE_KEY is missing or invalid. Auth will not work.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_PRIVATE_KEY must be set in production");
  }
}
if (!publicKey || !publicKey.includes("BEGIN")) {
  console.error("⚠️  JWT_PUBLIC_KEY is missing or invalid. Auth will not work.");
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_PUBLIC_KEY must be set in production");
  }
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 7;

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: string;
}

/** Sign an access token (RS256, 15 min) */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/** Verify an access token and return the payload */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  }) as AccessTokenPayload;
}

/** Generate a cryptographically random refresh token */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/** Hash a refresh token for DB storage (never store raw) */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Get refresh token expiry date */
export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

/** Generate a token family ID */
export function generateFamilyId(): string {
  return crypto.randomUUID();
}
