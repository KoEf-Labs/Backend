import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/src/lib/auth";
import { logger } from "@/src/lib/logger";
import { verifyApplePurchase } from "@/src/lib/subscriptions/apple";
import {
  syncSubscription,
  SubscriptionError,
} from "@/src/lib/subscriptions";

/**
 * POST /api/subscriptions/verify/apple
 * Body: { signedTransaction: string }
 *
 * iOS client calls this after StoreKit 2 returns a purchase. We verify
 * the JWS signedTransactionInfo against Apple's JWKS, match the
 * productId to a Plan row, and upsert the Subscription.
 *
 * Same endpoint is re-hit on app resume / restore purchases so the
 * server stays in sync even if the client missed a renewal event.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const signedTransaction =
      typeof body.signedTransaction === "string"
        ? body.signedTransaction
        : null;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "signedTransaction required" },
        { status: 400 }
      );
    }

    const verified = await verifyApplePurchase(signedTransaction);
    const sub = await syncSubscription(userId, verified);

    logger.info("apple_verify_ok", {
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
    logger.error("apple_verify_failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
