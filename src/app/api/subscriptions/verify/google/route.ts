import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { logger } from "@/src/lib/logger";
import { verifyGooglePurchase } from "@/src/lib/subscriptions/google";
import {
  syncSubscription,
  SubscriptionError,
} from "@/src/lib/subscriptions";

/**
 * POST /api/subscriptions/verify/google
 * Body: { purchaseToken: string, productId: string }
 *
 * Android client calls this after Google Play Billing returns a
 * purchase. Server fetches the authoritative state from Google Play
 * Developer API and upserts the Subscription row.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const purchaseToken =
      typeof body.purchaseToken === "string" ? body.purchaseToken : null;
    const productId =
      typeof body.productId === "string" ? body.productId : null;

    if (!purchaseToken || !productId) {
      return NextResponse.json(
        { error: "purchaseToken and productId required" },
        { status: 400 }
      );
    }

    const verified = await verifyGooglePurchase(purchaseToken, productId);
    const sub = await syncSubscription(userId, verified);

    logger.info("google_verify_ok", {
      userId,
      subscriptionId: sub.id,
      tier: verified.plan.tier,
      status: sub.status,
    });

    return NextResponse.json({
      subscription: sub,
      plan: verified.plan,
    });
  } catch (err) {
    if (err && (err as { name?: string }).name === "AuthError") {
      const e = err as { message: string; status: number };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err instanceof SubscriptionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Verify failed";
    logger.error("google_verify_failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
