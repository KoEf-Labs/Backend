import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.refreshToken) {
    return NextResponse.json(
      { error: "Refresh token is required" },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(body.refreshToken);

  // Delete the refresh token (and by extension, invalidate the session)
  const deleted = await prisma.refreshToken.deleteMany({
    where: { tokenHash },
  });

  if (deleted.count === 0) {
    // Token already invalidated or doesn't exist — still return success
    // to avoid leaking whether a token was valid
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
