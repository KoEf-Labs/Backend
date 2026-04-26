import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "@/src/lib/jwt";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";

export async function POST(req: Request) {
  // Rate limit
  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.refreshToken) {
    return NextResponse.json(
      { error: "Refresh token is required" },
      { status: 400 }
    );
  }

  const { refreshToken } = body;
  const tokenHash = hashToken(refreshToken);

  // Find the token in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken) {
    // Token not found — possible replay attack.
    // Try to detect reuse: if this was a previously rotated token,
    // the family still has active tokens — invalidate the entire family.
    // Since we hash tokens and can't reverse, we log and reject.
    // The rotation below ensures a stolen token can only be used once.
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 }
    );
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return NextResponse.json(
      { error: "Refresh token expired" },
      { status: 401 }
    );
  }

  // Suspended users can't refresh either — kill all their sessions
  if (storedToken.user.suspended) {
    await prisma.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
    return NextResponse.json(
      { error: "Your account has been suspended.", suspended: true },
      { status: 403 }
    );
  }

  // Deleted accounts cannot regain access. The DELETE /api/auth/me
  // handler clears all refresh tokens, but a stolen token from before
  // deletion would still find a row here — we double-check the user's
  // tombstone and refuse.
  if (storedToken.user.deletedAt) {
    await prisma.refreshToken.deleteMany({ where: { userId: storedToken.userId } });
    return NextResponse.json(
      { error: "Account deleted", deleted: true },
      { status: 403 }
    );
  }

  // Token rotation in a transaction to prevent race conditions.
  // Delete old → check family → create new happens atomically.
  const familyId = storedToken.familyId;
  const newRefreshToken = generateRefreshToken();

  const rotationResult = await prisma.$transaction(async (tx) => {
    // Delete the used token
    await tx.refreshToken.delete({ where: { id: storedToken.id } });

    // Check if other tokens in this family exist (replay attack indicator)
    const familyCount = await tx.refreshToken.count({ where: { familyId } });

    if (familyCount > 0) {
      // Multiple tokens in same family = replay attack detected
      logger.security("refresh_token_replay", {
        userId: storedToken.userId,
        familyId,
        ip,
      });
      await tx.refreshToken.deleteMany({ where: { familyId } });
      return { compromised: true };
    }

    // Create new token in same family
    await tx.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefreshToken),
        userId: storedToken.userId,
        familyId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { compromised: false };
  });

  if (rotationResult.compromised) {
    return NextResponse.json(
      { error: "Session compromised. Please login again." },
      { status: 401 }
    );
  }

  const accessToken = signAccessToken({
    sub: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  return NextResponse.json({
    accessToken,
    refreshToken: newRefreshToken,
  });
}
