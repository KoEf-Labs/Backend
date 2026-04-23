import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { verifyApplePurchase } from "@/src/lib/subscriptions/apple";
import { syncSubscription } from "@/src/lib/subscriptions";

export const runtime = "nodejs";

/**
 * POST /api/subscriptions/webhook/apple
 *
 * Apple App Store Server Notifications v2 endpoint. Apple posts a
 * signedPayload JWT whose payload has signedTransactionInfo +
 * signedRenewalInfo inside. We verify the outer JWT, pull the inner
 * signedTransactionInfo, and re-use verifyApplePurchase — the same
 * code path the in-app verify endpoint uses, so a renewal / refund /
 * cancel lands in the same "sync Subscription row" branch.
 */
const appleJwks = createRemoteJWKSet(
  new URL("https://api.storekit.itunes.apple.com/in-app-purchase/certs")
);

interface AppleNotificationPayload {
  notificationType: string;
  subtype?: string;
  data?: {
    bundleId?: string;
    environment?: string;
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const signedPayload =
    body && typeof body.signedPayload === "string" ? body.signedPayload : null;
  if (!signedPayload) {
    return NextResponse.json({ error: "signedPayload required" }, { status: 400 });
  }

  let notif: AppleNotificationPayload;
  try {
    const { payload } = await jwtVerify<AppleNotificationPayload>(
      signedPayload,
      appleJwks
    );
    notif = payload;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    logger.warn("apple_webhook_bad_sig", { error: msg });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const signedTx = notif.data?.signedTransactionInfo;
  if (!signedTx) {
    // Some notification types (like CONSUMPTION_REQUEST) don't carry a
    // transaction we need to act on — acknowledge and move on.
    logger.info("apple_webhook_noop", { type: notif.notificationType });
    return NextResponse.json({ ok: true });
  }

  try {
    const verified = await verifyApplePurchase(signedTx);
    // Find the user by looking up the existing Subscription — first
    // purchase verify already linked userId + providerSubId.
    const existing = await prisma.subscription.findUnique({
      where: { providerSubId: verified.providerSubId },
    });
    if (!existing) {
      // Webhook arrived before user-initiated verify. We stash nothing
      // for now — the next app open will re-verify and sync.
      logger.warn("apple_webhook_no_user", {
        providerSubId: verified.providerSubId,
        type: notif.notificationType,
      });
      return NextResponse.json({ ok: true });
    }
    await syncSubscription(existing.userId, verified);
    logger.info("apple_webhook_synced", {
      userId: existing.userId,
      type: notif.notificationType,
      subtype: notif.subtype,
      status: verified.status,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler failed";
    logger.error("apple_webhook_error", { error: message });
    // 500 so Apple retries — the notification is idempotent in our DB.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
