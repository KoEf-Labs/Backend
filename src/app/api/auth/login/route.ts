import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/src/lib/db";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
  generateFamilyId,
} from "@/src/lib/jwt";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { logger } from "@/src/lib/logger";

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
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  // Find user — use same error message for both cases to prevent user enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.auth("login_failed", { email, reason: "user_not_found", ip });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    logger.auth("login_failed", { email, userId: user.id, reason: "wrong_password", ip });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  // Generate tokens
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

  logger.auth("login", { userId: user.id, email: user.email, ip });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
}
