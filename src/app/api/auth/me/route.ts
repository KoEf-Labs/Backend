import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, role: true, emailVerified: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    if (err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
