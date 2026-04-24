import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import {
  cancelSubscriptionNow,
  SubscriptionError,
} from "@/src/lib/subscriptions";

/**
 * GET /api/internal/subscriptions/:id — detail view for the admin
 * subscription row page. Includes user and plan so the admin UI can
 * render both without extra round-trips.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: true,
      },
    });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ subscription: sub });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/internal/subscriptions/:id — manual edit. Admin may set:
 *   status, currentPeriodEnd, graceEndsAt
 * The canonical "extend" and "cancel" flows have their own endpoints —
 * this is the escape hatch for arbitrary fixes (e.g. refunding, moving
 * a row back to ACTIVE after a billing dispute was won).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const adminEmail = req.headers.get("x-admin-email") ?? "";

    const data: Record<string, unknown> = {};
    const allowedStatuses = [
      "ACTIVE",
      "TRIALING",
      "PAST_DUE",
      "CANCELED",
      "EXPIRED",
      "REFUNDED",
    ];
    if (typeof body.status === "string" && allowedStatuses.includes(body.status)) {
      data.status = body.status;
      if (body.status === "REFUNDED") data.refundedAt = new Date();
      if (body.status === "CANCELED" && !body.canceledAt) data.canceledAt = new Date();
    }
    if (typeof body.currentPeriodEnd === "string") {
      const d = new Date(body.currentPeriodEnd);
      if (!isNaN(d.getTime())) data.currentPeriodEnd = d;
    }
    if (body.graceEndsAt === null) {
      data.graceEndsAt = null;
    } else if (typeof body.graceEndsAt === "string") {
      const d = new Date(body.graceEndsAt);
      if (!isNaN(d.getTime())) data.graceEndsAt = d;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const sub = await prisma.subscription.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true, name: true } },
        plan: true,
      },
    });

    logger.info("admin_subscription_patched", {
      adminEmail,
      subscriptionId: id,
      fields: Object.keys(data),
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

/**
 * DELETE /api/internal/subscriptions/:id — admin cancels the sub,
 * applying the configured grace period. User keeps their tier until
 * graceEndsAt, then drops to Free. Use PATCH with status=EXPIRED if
 * you want an immediate downgrade with no grace.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    requireServiceToken(req);
    const { id } = await ctx.params;
    const adminEmail = req.headers.get("x-admin-email") ?? "";
    const sub = await cancelSubscriptionNow(id);
    logger.info("admin_subscription_canceled", {
      adminEmail,
      subscriptionId: id,
      graceEndsAt: sub.graceEndsAt,
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
