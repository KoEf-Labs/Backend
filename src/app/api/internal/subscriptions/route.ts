import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";

/**
 * GET /api/internal/subscriptions
 * Admin-facing subscription list. Supports filtering by status, tier,
 * provider and a small search over the user's email/name. Returns the
 * paginated rows so the admin page can render a table.
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
    const tier = searchParams.get("tier") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (tier) where.plan = { tier };
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        orderBy: { currentPeriodEnd: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          plan: { select: { id: true, tier: true, interval: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      subscriptions: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
