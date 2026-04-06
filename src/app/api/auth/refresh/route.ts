import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "@/lib/jwt";

export async function POST(req: Request) {
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
    // If we can identify the family, invalidate all tokens in it.
    // Since we can't identify family from an unknown token, just reject.
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 }
    );
  }

  // Check expiry
  if (storedToken.expiresAt < new Date()) {
    // Expired — clean up
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    return NextResponse.json(
      { error: "Refresh token expired" },
      { status: 401 }
    );
  }

  // Token rotation: delete old token, issue new one in same family
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  const newRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(newRefreshToken),
      userId: storedToken.userId,
      familyId: storedToken.familyId,
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
