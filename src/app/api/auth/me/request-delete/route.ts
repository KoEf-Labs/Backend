import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";
import { setAccountDeleteCode } from "@/src/lib/delete-confirmation";
import { sendAccountDeleteConfirmationEmail } from "@/src/lib/email";
import { logger } from "@/src/lib/logger";

/**
 * POST /api/auth/me/request-delete
 *
 * Step 1 of the in-app account deletion flow. Generates a 6-digit
 * confirmation code, stores it (10 min TTL) and emails the user. The
 * actual destructive call is DELETE /api/auth/me with `code` + the
 * password gate.
 *
 * Always returns 200 even if email send fails — we don't want to leak
 * whether the request reached the inbox. The user can retry.
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Six-digit numeric code. Same shape as the project-delete one so
    // the mobile UI can reuse the existing 6-cell input widget.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await setAccountDeleteCode(userId, code);

    try {
      await sendAccountDeleteConfirmationEmail(user.email, code);
    } catch (emailErr) {
      logger.error("account_delete_email_failed", {
        userId,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
      // Still return 200 — the code is stored, the user can ask again.
    }

    logger.info("account_delete_requested", { userId, ip });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
