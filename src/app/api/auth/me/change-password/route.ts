import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import {
  getPasswordChangeCode,
  clearPasswordChangeCode,
} from "@/src/lib/delete-confirmation";
import { logger } from "@/src/lib/logger";

/**
 * POST /api/auth/me/change-password
 * Body: { code: string, newPassword: string }
 *
 * Step 2 of the in-app password change flow. Burns the one-time code
 * the user just received via email, validates the new password, hashes
 * it, swaps it into the row, and revokes every active refresh token
 * so other devices have to log in again with the new password.
 *
 * The current-password check happened at request-password-change so
 * we don't ask for it again — the email code is the second factor.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const ip = getClientIp(req);
    if (await isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : null;
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : null;

    if (!code || !newPassword) {
      return NextResponse.json(
        { error: "Code and new password are required" },
        { status: 400 }
      );
    }

    // Same strength rules as register.
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json(
        { error: "Password must be 8-128 characters" },
        { status: 400 }
      );
    }
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumberOrSymbol =
      /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNumberOrSymbol) {
      return NextResponse.json(
        {
          error:
            "Password must include uppercase, lowercase, and a number or symbol",
        },
        { status: 400 }
      );
    }

    const stored = await getPasswordChangeCode(userId);
    if (!stored) {
      return NextResponse.json(
        { error: "Please request a code first" },
        { status: 400 }
      );
    }
    if (stored.code !== code) {
      return NextResponse.json(
        { error: "Invalid confirmation code" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePwd: false },
      }),
      // Force every other device to re-login with the new password.
      prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    await clearPasswordChangeCode(userId);

    logger.info("password_changed", { userId, ip });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
