import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

/**
 * GET /api/internal/plans — all plans (active + inactive) for admin.
 * Includes store product IDs so the admin UI can fill them in once
 * App Store Connect / Play Console products exist.
 */
export async function GET(req: NextRequest) {
  try {
    requireServiceToken(req);
    const plans = await prisma.plan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ plans });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
