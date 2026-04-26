import { NextRequest, NextResponse } from "next/server";
import { requireServiceToken } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import {
  getSubscriptionSettings,
  invalidateSubscriptionSettingsCache,
} from "@/src/lib/subscriptions";

/**
 * GET /api/internal/subscriptions/settings — returns the singleton
 * settings row, creating it with defaults on first read.
 */
export async function GET(req: NextRequest) {
  try {
    requireServiceToken(req);
    const settings = await getSubscriptionSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/internal/subscriptions/settings — admin updates knobs.
 * Currently only gracePeriodDays; add fields as they come up. Note:
 * changing gracePeriodDays only affects rows that transition into
 * grace *after* the change — existing rows keep their stamped
 * graceEndsAt.
 */
export async function PATCH(req: NextRequest) {
  try {
    requireServiceToken(req);
    const body = await req.json().catch(() => ({}));
    const adminEmail = req.headers.get("x-admin-email") ?? "";

    const data: Record<string, unknown> = {};
    if (body.gracePeriodDays !== undefined) {
      const n = Math.round(Number(body.gracePeriodDays));
      if (!Number.isFinite(n) || n < 0 || n > 365) {
        return NextResponse.json(
          { error: "gracePeriodDays must be 0-365" },
          { status: 400 }
        );
      }
      data.gracePeriodDays = n;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const settings = await prisma.subscriptionSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    invalidateSubscriptionSettingsCache();

    logger.info("admin_subscription_settings_updated", {
      adminEmail,
      fields: Object.keys(data),
    });

    return NextResponse.json({ settings });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
