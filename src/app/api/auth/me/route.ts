import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

const USER_SELECT = { id: true, email: true, name: true, phone: true, avatar: true, role: true, emailVerified: true, createdAt: true };

export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
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

/**
 * PATCH /api/auth/me — update profile (name, phone)
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();

    const updates: Record<string, string | null> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim().slice(0, 100);
      if (name.length < 1) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim().slice(0, 20);
    }

    if (typeof body.avatar === "string") {
      // avatar can be: "avatar_1" to "avatar_10" (default), URL (uploaded photo), or null (remove)
      updates.avatar = body.avatar.trim().slice(0, 500) || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: USER_SELECT,
    });

    return NextResponse.json(user);
  } catch (err: any) {
    if (err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("[PATCH /api/auth/me] Error:", message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
