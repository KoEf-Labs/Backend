import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { verifyGooglePurchase } from "@/src/lib/subscriptions/google";
import { syncSubscription } from "@/src/lib/subscriptions";

export const runtime = "nodejs";

/**
 * POST /api/subscriptions/webhook/google
 *
 * Google Play Real-Time Developer Notifications (RTDN) come in via
 * Pub/Sub push: a base64-encoded JSON message envelope. We decode the
 * payload, pull the purchaseToken + productId, re-verify via the
 * subscriptionsv2 API (same flow as client verify), and upsert.
 *
 * Pub/Sub expects a 2xx within 10s or it retries. Our verify is
 * idempotent, so retries are safe.
 */
interface RtdnEnvelope {
  message?: {
    data?: string; // base64
  };
}

interface RtdnPayload {
  packageName?: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string; // productId
  };
  oneTimeProductNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    sku: string;
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as RtdnEnvelope | null;
  const b64 = body?.message?.data;
  if (!b64) {
    // Pub/Sub sometimes sends health checks with empty data — 200.
    return NextResponse.json({ ok: true });
  }

  let payload: RtdnPayload;
  try {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    payload = JSON.parse(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "decode failed";
    logger.warn("google_webhook_decode_failed", { error: msg });
    return NextResponse.json({ ok: true });
  }

  const sub = payload.subscriptionNotification;
  if (!sub) {
    logger.info("google_webhook_noop", { payload });
    return NextResponse.json({ ok: true });
  }

  try {
    const verified = await verifyGooglePurchase(
      sub.purchaseToken,
      sub.subscriptionId
    );
    const existing = await prisma.subscription.findUnique({
      where: { providerSubId: verified.providerSubId },
    });
    if (!existing) {
      logger.warn("google_webhook_no_user", {
        providerSubId: verified.providerSubId,
        notificationType: sub.notificationType,
      });
      return NextResponse.json({ ok: true });
    }
    await syncSubscription(existing.userId, verified);
    logger.info("google_webhook_synced", {
      userId: existing.userId,
      notificationType: sub.notificationType,
      status: verified.status,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler failed";
    logger.error("google_webhook_error", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
