import crypto from "crypto";
import { prisma } from "@/src/lib/db";
import { VerificationTokenType } from "@prisma/client";

const EMAIL_VERIFY_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;

/** Generate a 6-digit code for email verification */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Generate a secure random token for password reset */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Hash a token/code for DB storage */
export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Create an email verification token */
export async function createEmailVerificationToken(userId: string) {
  // Delete any existing email verify tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { userId, type: "EMAIL_VERIFY" },
  });

  const code = generateVerificationCode();
  await prisma.verificationToken.create({
    data: {
      tokenHash: hashVerificationToken(code),
      type: "EMAIL_VERIFY",
      userId,
      expiresAt: new Date(
        Date.now() + EMAIL_VERIFY_EXPIRY_HOURS * 60 * 60 * 1000
      ),
    },
  });

  return code;
}

/** Create a password reset token */
export async function createPasswordResetToken(userId: string) {
  // Delete any existing reset tokens for this user
  await prisma.verificationToken.deleteMany({
    where: { userId, type: "PASSWORD_RESET" },
  });

  const token = generateResetToken();
  await prisma.verificationToken.create({
    data: {
      tokenHash: hashVerificationToken(token),
      type: "PASSWORD_RESET",
      userId,
      expiresAt: new Date(
        Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000
      ),
    },
  });

  return token;
}

/** Verify a token and return the associated user ID. Deletes token on success. */
export async function verifyToken(
  token: string,
  type: VerificationTokenType
): Promise<string | null> {
  const tokenHash = hashVerificationToken(token);

  const stored = await prisma.verificationToken.findUnique({
    where: { tokenHash },
  });

  if (!stored || stored.type !== type) return null;
  if (stored.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: stored.id } });
    return null;
  }

  // Delete the token (single use)
  await prisma.verificationToken.delete({ where: { id: stored.id } });
  return stored.userId;
}
