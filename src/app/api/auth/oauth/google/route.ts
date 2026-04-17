import { NextResponse } from "next/server";
import { verifyGoogleIdToken, OAuthError } from "@/src/lib/oauth";
import { signInWithOAuth } from "@/src/lib/oauth-signin";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";

/**
 * POST /api/auth/oauth/google
 * Body: { idToken: string }
 *
 * The mobile client runs google_sign_in natively, gets an ID token, and
 * forwards it here. We verify it against Google, then hand back our own
 * session tokens.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  try {
    const profile = await verifyGoogleIdToken(idToken);
    const result = await signInWithOAuth("google", profile);

    logger.auth(result.created ? "oauth_signup" : "oauth_login", {
      userId: result.user.id,
      email: result.user.email,
      provider: "google",
      ip,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "OAuth failed";
    logger.error("Google OAuth failed", { error: message, ip });
    return NextResponse.json({ error: "Google sign-in failed" }, { status: 500 });
  }
}
