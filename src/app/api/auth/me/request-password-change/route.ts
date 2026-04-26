import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { setPasswordChangeCode } from "@/src/lib/delete-confirmation";
import { sendPasswordChangeConfirmationEmail } from "@/src/lib/email";
import { logger } from "@/src/lib/logger";

/**
 * POST /api/auth/me/request-password-change
 * Body: { currentPassword: string }
 *
 * Step 1 of the in-app password change flow. Verifies the user's
 * current password (so a stolen unlocked phone can't start a change),
 * generates a 6-digit code, stores it for 10 minutes and emails it.
 *
 * The actual change lands at POST /api/auth/me/change-password with
 * { code, newPassword }. We don't ask the user to retype the current
 * password there — proving it once at this step is enough, and the
 * email code chains the second factor.
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
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Password account check. OAuth-only accounts have a placeholder
    // hash starting with "$oauth$" — they can't change "their"
    // password because they never set one; they have to use the
    // forgot-password flow to set one first.
    const isPasswordAccount =
      user.passwordHash &&
      user.passwordHash.length > 0 &&
      !user.passwordHash.startsWith("$oauth$");
    if (!isPasswordAccount) {
      return NextResponse.json(
        {
          error:
            "This account uses social sign-in. Use 'Forgot password' to set a password first.",
        },
        { status: 400 }
      );
    }

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password required" },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash!);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await setPasswordChangeCode(userId, code);

    try {
      await sendPasswordChangeConfirmationEmail(user.email, code);
    } catch (emailErr) {
      logger.error("password_change_email_failed", {
        userId,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    logger.info("password_change_requested", { userId, ip });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
