import { NextResponse } from "next/server";
import { verifyAppleIdToken, OAuthError } from "@/src/lib/oauth";
import { signInWithOAuth } from "@/src/lib/oauth-signin";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";

/**
 * POST /api/auth/oauth/apple
 * Body: { idToken: string, displayName?: string, nonce?: string }
 *
 * Apple only returns the user's name on the very first authorization so
 * the mobile client caches it locally and forwards it on sign-up. On
 * subsequent sign-ins the client sends no name and we use what's already
 * stored.
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
  const displayName =
    typeof body?.displayName === "string" ? body.displayName : null;
  const nonce = typeof body?.nonce === "string" ? body.nonce : undefined;

  if (!idToken) {
    return NextResponse.json({ error: "idToken required" }, { status: 400 });
  }

  try {
    const profile = await verifyAppleIdToken(idToken, { expectedNonce: nonce });
    const result = await signInWithOAuth("apple", profile, displayName);

    logger.auth(result.created ? "oauth_signup" : "oauth_login", {
      userId: result.user.id,
      email: result.user.email,
      provider: "apple",
      ip,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "OAuth failed";
    logger.error("Apple OAuth failed", { error: message, ip });
    return NextResponse.json({ error: "Apple sign-in failed" }, { status: 500 });
  }
}
