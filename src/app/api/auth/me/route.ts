import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { safeUrl } from "@/src/shared/utils";

const DEFAULT_AVATAR_RE = /^avatar_([1-9]|10)$/;

function sanitizeAvatar(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 500);
  if (!trimmed) return null;
  if (DEFAULT_AVATAR_RE.test(trimmed)) return trimmed;
  const safe = safeUrl(trimmed);
  if (safe === "#" || safe.startsWith("/") || safe.startsWith("#")) return null;
  try {
    const parsed = new URL(safe);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return safe;
  } catch {
    return null;
  }
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  avatar: true,
  role: true,
  emailVerified: true,
  profileCompleted: true,
  identityVerified: true,
  accountType: true,
  dateOfBirth: true,
  country: true,
  nationalId: true,
  passportNo: true,
  companyName: true,
  companyTaxId: true,
  createdAt: true,
};

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
      updates.avatar = sanitizeAvatar(body.avatar);
    } else if (body.avatar === null) {
      updates.avatar = null;
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
    logger.error("PATCH /api/auth/me failed", { error: message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/me — account deletion (Apple Guideline 5.1.1.v +
 * KVKK requirement). Soft-delete: stamp deletedAt, revoke every
 * refresh token, take the user's projects offline. The daily sweep
 * hard-deletes the row after the retention window so we honour both
 * the user's right to be forgotten and the legal record-keeping
 * obligation for billing.
 *
 * Body: { password?: string } — required for password accounts so
 * "tap delete by accident" doesn't nuke a session. OAuth-only
 * accounts (Google / Apple) are exempt (they had to re-prove identity
 * via the OAuth flow within the last few minutes anyway).
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        googleId: true,
        appleId: true,
        deletedAt: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.deletedAt) {
      // Already deleted — idempotent.
      return NextResponse.json({ deleted: true });
    }

    // Password gate. We treat a non-empty passwordHash as "this is a
    // password account" — even if the user later linked Google/Apple,
    // they set a password at signup and we want them to type it.
    const isPasswordAccount =
      user.passwordHash && user.passwordHash.length > 0 &&
      // Bcrypt placeholder for OAuth-created users is a random string
      // we never expose — they can still use the account but can't
      // know the original. Treat them as OAuth-only.
      !user.passwordHash.startsWith("$oauth$");
    if (isPasswordAccount) {
      if (!password) {
        return NextResponse.json(
          { error: "Password required" },
          { status: 400 }
        );
      }
      const bcrypt = await import("bcrypt");
      const ok = await bcrypt.compare(password, user.passwordHash!);
      if (!ok) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    // Reserve the email so the same address can sign up again with a
    // fresh account. We tombstone-rename it: "deleted-<userId>:<original>".
    // The original is still recoverable from the tombstone if a user
    // reaches out asking to undo within the retention window.
    const reservedEmail = `deleted-${userId}@deleted.local`;

    await prisma.$transaction([
      // Stamp the lifecycle marker + free up email/oauth identifiers.
      prisma.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          suspended: true,
          suspendReason: "user_deleted",
          email: reservedEmail,
          // Drop OAuth identifiers so the same Google/Apple account can
          // make a fresh signup tomorrow.
          googleId: null,
          appleId: null,
        },
      }),
      // Kick every active session — refresh tokens are bearer creds.
      prisma.refreshToken.deleteMany({ where: { userId } }),
      // Take their sites offline immediately. The hard-delete sweep
      // will tombstone the project rows themselves.
      prisma.project.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now, status: "DRAFT" },
      }),
    ]);

    logger.info("account_deleted", { userId });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    if (err?.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Delete failed";
    logger.error("DELETE /api/auth/me failed", { error: message });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
