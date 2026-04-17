import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

/**
 * GET /api/internal/payments
 * Admin-facing list of payments. Supports pagination + filters:
 *   ?status=SUCCEEDED|PENDING|FAILED|REFUNDED
 *   ?provider=STRIPE|IYZICO
 *   ?userId=...
 *   ?search=...  (matches purpose)
 */
export async function GET(req: NextRequest) {
  try {
    requireServiceToken(req);
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") ?? 50))
    );
    const status = searchParams.get("status") ?? undefined;
    const provider = searchParams.get("provider") ?? undefined;
    const userId = searchParams.get("userId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (userId) where.userId = userId;
    if (search) where.purpose = { contains: search, mode: "insensitive" };

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      payments: items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
