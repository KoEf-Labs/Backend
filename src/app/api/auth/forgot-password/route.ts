import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { createPasswordResetToken } from "@/src/lib/verification";
import { sendPasswordResetEmail } from "@/src/lib/email";
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

    // Send reset email (console in dev, real provider in prod)
    await sendPasswordResetEmail(user.email, token);
  }

  // Same response whether user exists or not
  return NextResponse.json({
    message: "If an account exists with this email, a reset link has been sent.",
  });
}
