import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { logger } from "@/src/lib/logger";
import {
  extendSubscription,
  SubscriptionError,
} from "@/src/lib/subscriptions";

/**
 * POST /api/internal/subscriptions/:id/extend — bumps currentPeriodEnd
 * by `days`, clears grace/cancel, sets status back to ACTIVE. Used as
 * a quick admin action ("comp the user 30 days after an incident").
 * Body: { "days": number }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const days = Math.round(Number(body.days));
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return NextResponse.json(
        { error: "days must be between 1 and 3650" },
        { status: 400 }
      );
    }
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    const sub = await extendSubscription(id, days);
    logger.info("admin_subscription_extended", {
      adminEmail,
      subscriptionId: id,
      days,
      newEnd: sub.currentPeriodEnd,
    });
    return NextResponse.json({ subscription: sub });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err instanceof SubscriptionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
