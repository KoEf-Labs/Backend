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
import { createEmailVerificationToken } from "@/src/lib/verification";

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

  const { email, password, name, phone } = body;

  // Validation
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Email, password and name are required" },
      { status: 400 }
    );
  }

  // Email validation
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_EMAIL_LENGTH = 254;
  if (
    typeof email !== "string" ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_REGEX.test(email)
  ) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // Password validation: min 8 chars, must have uppercase + lowercase + number/symbol
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be 8-128 characters" },
      { status: 400 }
    );
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasUpper || !hasLower || !hasNumberOrSymbol) {
    return NextResponse.json(
      { error: "Password must include uppercase, lowercase, and a number or symbol" },
      { status: 400 }
    );
  }

  // Name length check
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 100) {
    return NextResponse.json(
      { error: "Name must be 1-100 characters" },
      { status: 400 }
    );
  }

  // Check existing user
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone: phone || null,
    },
  });

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

  // Generate email verification code
  const verificationCode = await createEmailVerificationToken(user.id);

  // TODO: Send verification email via email service
  // For now, return the code in response (dev only)
  console.log(`[DEV] Email verification code for ${email}: ${verificationCode}`);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: false,
    },
    accessToken,
    refreshToken,
    // Remove this in production — send via email only
    ...(process.env.NODE_ENV !== "production" && { verificationCode }),
  });
}
