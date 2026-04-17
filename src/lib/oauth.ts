/**
 * OAuth token verification (Google + Apple).
 *
 * The mobile client runs the native flow (google_sign_in / SignInWithApple),
 * gets an ID token back from the provider, and posts it to our endpoints.
 * This module validates that token server-side before we trust the claims.
 *
 * Until credentials are issued, both verifiers short-circuit if the required
 * env vars are empty so the feature can ship disabled without a code change.
 */
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface VerifiedOAuthProfile {
  providerId: string; // provider-scoped stable user ID (sub claim)
  email: string;
  emailVerified: boolean;
  name: string | null;
}

// ── Google ──────────────────────────────────────────────────────────────

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return null;
  if (!googleClient) googleClient = new OAuth2Client();
  return googleClient;
}

export async function verifyGoogleIdToken(
  idToken: string
): Promise<VerifiedOAuthProfile> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const client = getGoogleClient();
  if (!client || !clientId) {
    throw new OAuthError("Google OAuth is not configured", 503);
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    throw new OAuthError("Google token has no subject", 401);
  }
  if (!payload.email) {
    throw new OAuthError("Google token missing email", 401);
  }
  return {
    providerId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

// ── Apple ───────────────────────────────────────────────────────────────

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

// jose caches keys internally; we create the set once per process.
const appleJwks = createRemoteJWKSet(APPLE_JWKS_URL);

/**
 * Apple's identity token is a signed JWT. The audience differs by platform:
 * iOS native flow uses the app's bundle ID, web/backend flow uses the
 * Services ID. We accept both so a single endpoint handles all clients.
 */
export async function verifyAppleIdToken(
  idToken: string,
  { expectedNonce }: { expectedNonce?: string } = {}
): Promise<VerifiedOAuthProfile> {
  const serviceId = process.env.APPLE_SERVICE_ID;
  if (!serviceId) {
    throw new OAuthError("Apple Sign-In is not configured", 503);
  }

  // Audience is checked after decoding: Apple signs with the issuer's keys
  // regardless of which client asked. We accept either the Services ID (web)
  // or any client-provided bundle ID that matches the APP_BUNDLE_ID env.
  const expectedAudiences = [serviceId];
  if (process.env.APPLE_APP_BUNDLE_ID) {
    expectedAudiences.push(process.env.APPLE_APP_BUNDLE_ID);
  }

  let payload;
  try {
    const result = await jwtVerify(idToken, appleJwks, {
      issuer: APPLE_ISSUER,
      audience: expectedAudiences,
    });
    payload = result.payload;
  } catch (err) {
    throw new OAuthError(
      err instanceof Error ? `Apple token invalid: ${err.message}` : "Apple token invalid",
      401
    );
  }

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new OAuthError("Apple token nonce mismatch", 401);
  }

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!sub || !email) {
    throw new OAuthError("Apple token missing sub/email", 401);
  }

  return {
    providerId: sub,
    email: email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: null, // Apple only returns name on first authorization; client relays it separately
  };
}

export class OAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OAuthError";
    this.status = status;
  }
}
