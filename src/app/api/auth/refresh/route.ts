import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "@/src/lib/jwt";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";

export async function POST(req: Request) {
  // Rate limit
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
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

  // Token rotation: delete old token, issue new one in same family.
  // If the old token is reused after rotation, it won't be found (deleted above),
  // so the attacker gets rejected. To fully protect against stolen tokens,
  // invalidate the entire family if a deleted token's family is still active.
  const familyId = storedToken.familyId;

  // Delete the used token
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  // Check if there are other tokens in this family that shouldn't exist
  // (indicates a previously rotated token was somehow reused in parallel)
  const familyCount = await prisma.refreshToken.count({
    where: { familyId },
  });

  if (familyCount > 0) {
    // Multiple tokens in same family = replay attack detected
    // Invalidate entire family — force re-login
    await prisma.refreshToken.deleteMany({ where: { familyId } });
    return NextResponse.json(
      { error: "Session compromised. Please login again." },
      { status: 401 }
    );
  }

  const newRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshToken),
      userId: storedToken.userId,
      familyId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

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
