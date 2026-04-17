import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

/**
 * GET /api/themes/entitlements — current user's unlocked premium themes.
 * Response is cheap; the mobile client can poll it after a purchase to
 * confirm before falling back to /me.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const entitlements = await prisma.userThemeEntitlement.findMany({
      where: { userId },
      orderBy: { acquiredAt: "desc" },
      select: { themeName: true, acquiredAt: true, paymentId: true },
    });
    return NextResponse.json({ entitlements });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
