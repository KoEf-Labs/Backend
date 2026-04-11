import { NextResponse } from "next/server";
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
  if (!body?.code) {
    return NextResponse.json(
      { error: "Verification code is required" },
      { status: 400 }
    );
  }

  const userId = await verifyToken(body.code, "EMAIL_VERIFY");
  if (!userId) {
    return NextResponse.json(
      { error: "Invalid or expired verification code" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  return NextResponse.json({ message: "Email verified successfully" });
}
