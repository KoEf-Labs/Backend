/**
 * Upsert + sign-in flow for OAuth providers.
 *
 * Given a verified OAuth profile (from oauth.ts), this finds or creates the
 * matching User and issues our own access + refresh tokens. It encapsulates
 * the account-linking rule: if an email/password user exists with the same
 * email, we attach the provider ID to that account instead of creating a
 * duplicate. This matches the "auto-link on email match" decision.
 *
 * OAuth-signed users get a random 32-byte password hash — they can't log in
 * with password but the column stays non-nullable. They can use the
 * existing forgot-password flow to set a real password later.
 */
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/src/lib/db";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  generateFamilyId,
} from "@/src/lib/jwt";
import type { VerifiedOAuthProfile } from "@/src/lib/oauth";

export type OAuthProvider = "google" | "apple";

export interface OAuthSignInResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    role: string;
    emailVerified: boolean;
    profileCompleted: boolean;
  };
  accessToken: string;
  refreshToken: string;
  created: boolean; // true if we created a new user row
}

/**
 * displayName comes from the client for Apple (which only returns the name
 * on the very first authorization). For Google we already have it on the
 * token and can ignore the client value.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  profile: VerifiedOAuthProfile,
  displayName?: string | null
): Promise<OAuthSignInResult> {
  // Step 1: look up by provider ID (fast path for returning OAuth users).
  let user = await prisma.user.findUnique({
    where:
      provider === "google"
        ? { googleId: profile.providerId }
        : { appleId: profile.providerId },
  });

  // Step 2: fall back to email match. This is the auto-link rule — an
  // existing email/password account gets the provider ID attached on first
  // OAuth sign-in, no duplicate row.
  if (!user) {
    const existing = await prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          ...(provider === "google"
            ? { googleId: profile.providerId }
            : { appleId: profile.providerId }),
          // Provider has verified the email for us; promote our flag too.
          emailVerified: existing.emailVerified || profile.emailVerified,
        },
      });
    }
  }

  // Step 3: create a brand-new user.
  let created = false;
  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    user = await prisma.user.create({
      data: {
        email: profile.email,
        passwordHash,
        name: (displayName ?? profile.name ?? profile.email.split("@")[0]).slice(0, 100),
        emailVerified: profile.emailVerified, // trust the provider
        ...(provider === "google"
          ? { googleId: profile.providerId }
          : { appleId: profile.providerId }),
      },
    });
    created = true;
  }

  // Step 4: issue our own token pair. Same shape as email/password login.
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken();
  const familyId = generateFamilyId();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      familyId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      emailVerified: user.emailVerified,
      profileCompleted: user.profileCompleted,
    },
    accessToken,
    refreshToken,
    created,
  };
}
