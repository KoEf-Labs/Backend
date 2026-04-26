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
import { sendVerificationEmail } from "@/src/lib/email";
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
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, name, phone, acceptedTerms, termsVersion } = body;

  // Validation
  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Email, password and name are required" },
      { status: 400 }
    );
  }

  // Terms of service must be explicitly accepted at signup. The client
  // sends `acceptedTerms: true` together with the version string they
  // saw — we stamp both so we can re-prompt when the version changes.
  if (acceptedTerms !== true) {
    return NextResponse.json(
      { error: "You must accept the user agreement to register" },
      { status: 400 }
    );
  }

  // Email validation — requires at least 2-char TLD and proper format
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
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
      acceptedTermsAt: new Date(),
      acceptedTermsVersion:
        typeof termsVersion === "string" && termsVersion.length <= 20
          ? termsVersion
          : "1.0",
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

  logger.auth("register", { userId: user.id, email: user.email, ip });

  // Generate email verification code
  const verificationCode = await createEmailVerificationToken(user.id);

  // Send verification email (console in dev, real provider in prod)
  await sendVerificationEmail(email, verificationCode);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: null,
      phone: user.phone,
      role: user.role,
      emailVerified: false,
      profileCompleted: false,
    },
    accessToken,
    refreshToken,
  });
}
