import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import {
  constructStripeEvent,
} from "@/src/lib/payments/stripe";
import { PaymentError } from "@/src/lib/payments";

/**
 * POST /api/payments/webhook/stripe
 *
 * Stripe posts JSON here; we verify the `stripe-signature` header against
 * STRIPE_WEBHOOK_SECRET before trusting the body. The raw body is what
 * gets signed, so we read it as text (not JSON). Events we react to:
 *   - payment_intent.succeeded / .payment_failed — flip Payment.status
 *   - charge.refunded — mirror the admin-initiated refund state
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event;
  try {
    event = constructStripeEvent(rawBody, sig);
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Signature check failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        await markByProviderTxnId(pi.id, "SUCCEEDED", pi);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        await markByProviderTxnId(pi.id, "FAILED", pi);
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object;
        if (typeof ch.payment_intent === "string") {
          await markByProviderTxnId(ch.payment_intent, "REFUNDED", ch);
        }
        break;
      }
      default:
        // Unhandled event type — acknowledge so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // If DB is momentarily down, return 500 so Stripe retries the delivery.
    const message = err instanceof Error ? err.message : "webhook handler failed";
    logger.error("Stripe webhook handler failed", {
      event: event.type,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markByProviderTxnId(
  providerTxnId: string,
  status: "SUCCEEDED" | "FAILED" | "REFUNDED",
  meta: unknown
) {
  const payment = await prisma.payment.findUnique({
    where: { providerTxnId },
  });
  if (!payment) {
    logger.warn("Stripe webhook for unknown payment", { providerTxnId });
    return;
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      providerMeta: meta as object,
      refundedAt: status === "REFUNDED" ? new Date() : undefined,
    },
  });
}
