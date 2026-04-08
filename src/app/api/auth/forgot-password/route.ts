import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createPasswordResetToken } from "@/src/lib/verification";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (user) {
    const token = await createPasswordResetToken(user.id);

    // TODO: Send password reset email with link containing token
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Password reset token for ${user.email}: ${token.slice(0, 8)}...`);
    }
  }

  // Same response whether user exists or not
  return NextResponse.json({
    message: "If an account exists with this email, a reset link has been sent.",
  });
}
