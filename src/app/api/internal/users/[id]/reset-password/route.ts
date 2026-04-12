import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireServiceToken, AuthError } from "@/src/lib/auth";
import { createPasswordResetToken } from "@/src/lib/verification";
import { sendPasswordResetEmail } from "@/src/lib/email";
import { writeAudit } from "@/src/lib/audit";
import { logger } from "@/src/lib/logger";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/internal/users/[id]/reset-password
 *
 * Admin-triggered password reset. Issues a reset token and emails it to
 * the user, same flow as the public /api/auth/forgot-password endpoint
 * but bypasses rate limit and email enumeration guard.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    requireServiceToken(req);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const adminId = req.headers.get("x-admin-id") || "unknown";
  const adminEmail = req.headers.get("x-admin-email") || "unknown";

  try {
    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("admin_reset_password_failed", { userId: id, error: msg });
    return NextResponse.json(
      { error: "Failed to send reset email. Please try again." },
      { status: 500 }
    );
  }

  await writeAudit({
    adminId,
    adminEmail,
    action: "reset_user_password",
    targetType: "user",
    targetId: id,
  });

  logger.info("admin_action", {
    type: "admin_action",
    action: "reset_user_password",
    targetId: id,
    adminId,
  });

  return NextResponse.json({ ok: true, email: user.email });
}
