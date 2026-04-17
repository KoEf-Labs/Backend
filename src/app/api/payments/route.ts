import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

/**
 * GET /api/payments — current user's payment history. Used by the mobile
 * app's "Orders" screen. Keep the response small; admin tooling uses its
 * own internal endpoint with more fields.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = requireAuth(req);

    const rows = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        amount: true,
        currency: true,
        status: true,
        purpose: true,
        refundedAt: true,
        createdAt: true,
      },
      take: 100,
    });

    return NextResponse.json({ payments: rows });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
