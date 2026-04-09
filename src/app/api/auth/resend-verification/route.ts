import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAuth } from "@/src/lib/auth";
import { createEmailVerificationToken } from "@/src/lib/verification";
import { sendVerificationEmail } from "@/src/lib/email";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  let userId: string;
  try {
    userId = requireAuth(req);
  } catch {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: "Email already verified" },
      { status: 400 }
    );
  }

  const code = await createEmailVerificationToken(userId);

  await sendVerificationEmail(user.email, code);

  return NextResponse.json({ message: "Verification code sent" });
}
