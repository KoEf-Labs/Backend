import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/src/lib/db";
import { verifyToken } from "@/src/lib/verification";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.token || !body?.newPassword) {
    return NextResponse.json(
      { error: "Token and new password are required" },
      { status: 400 }
    );
  }

  const { token, newPassword } = body;

  // Validate new password
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json(
      { error: "Password must be 8-128 characters" },
      { status: 400 }
    );
  }
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  if (!hasUpper || !hasLower || !hasNumberOrSymbol) {
    return NextResponse.json(
      { error: "Password must include uppercase, lowercase, and a number or symbol" },
      { status: 400 }
    );
  }

  // Verify reset token
  const userId = await verifyToken(token, "PASSWORD_RESET");
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or expired reset token" },
      { status: 400 }
    );
  }

  // Update password
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all refresh tokens — force re-login on all devices
  await prisma.refreshToken.deleteMany({ where: { userId } });

  return NextResponse.json({
    message: "Password reset successfully. Please login with your new password.",
  });
}
