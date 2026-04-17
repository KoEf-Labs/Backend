/**
 * Stripe integration — used for all non-TR customers. The mobile client
 * uses flutter_stripe's Payment Sheet, which needs: customer id, ephemeral
 * key, payment intent client secret, publishable key. We return all four
 * in one call so the client can open the sheet immediately.
 */
import Stripe from "stripe";
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import {
  CreateIntentInput,
  IntentResult,
  PaymentError,
  RefundInput,
  RefundResult,
} from "./types";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new PaymentError("Stripe is not configured", 503);
  }
  _stripe = new Stripe(key, {
    // Pin the API version so an upstream change can't break our code
    // silently — upgrades are deliberate.
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  return _stripe;
}

/**
 * Ensure a Stripe Customer exists for this user; cache the id on the User
 * row so repeat purchases and saved cards attach to the same customer.
 */
async function ensureCustomer(input: {
  userId: string;
  email: string;
  name: string;
  savedCustomerRef?: string | null;
}): Promise<string> {
  const stripe = getStripe();
  if (input.savedCustomerRef) {
    // Trust but verify — if the customer was deleted upstream, create a new
    // one and refresh the cached id.
    try {
      const existing = await stripe.customers.retrieve(input.savedCustomerRef);
      if (!existing.deleted) return input.savedCustomerRef;
    } catch {
      // fall through — create fresh
    }
  }
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: { userId: input.userId },
  });
  await prisma.user.update({
    where: { id: input.userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createStripeIntent(
  input: CreateIntentInput
): Promise<IntentResult> {
  const stripe = getStripe();
  const customerId = await ensureCustomer({
    userId: input.userId,
    email: input.customerEmail,
    name: input.customerName,
    savedCustomerRef: input.savedCustomerRef,
  });

  // 1) Create the Payment row in PENDING so webhooks have a home to write to.
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      provider: "STRIPE",
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      purpose: input.purpose,
      status: "PENDING",
    },
  });

  // 2) Ephemeral key — lets the mobile SDK manage this customer's saved cards.
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2026-03-25.dahlia" }
  );

  // 3) Payment intent. setup_future_usage=off_session saves the card so
  //    the next purchase can skip SCA. Customer is the only sensitive id
  //    we ever send to the client.
  const intent = await stripe.paymentIntents.create({
    amount: input.amount,
    currency: input.currency.toLowerCase(),
    customer: customerId,
    setup_future_usage: "off_session",
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId: input.userId,
      paymentId: payment.id,
      purpose: input.purpose,
    },
  });

  // Wire the provider ID back onto our Payment row so the webhook can
  // reconcile even if the metadata lookup ever breaks.
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerTxnId: intent.id },
  });

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? "";
  if (!publishableKey) {
    logger.warn("STRIPE_PUBLISHABLE_KEY is empty — mobile sheet will fail");
  }

  return {
    provider: "stripe",
    paymentId: payment.id,
    clientAction: {
      kind: "stripe_payment_sheet",
      clientSecret: intent.client_secret!,
      customerId,
      ephemeralKey: ephemeralKey.secret!,
      publishableKey,
    },
  };
}

export async function refundStripe(input: RefundInput): Promise<RefundResult> {
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: input.providerTxnId,
    amount: input.amount,
    reason: "requested_by_customer",
    metadata: input.reason ? { reason: input.reason } : undefined,
  });
  return {
    refundedAt: new Date(),
    providerRefundId: refund.id,
  };
}

/**
 * Verifies the stripe-signature header and returns the parsed event. Throws
 * PaymentError(400) on any signature mismatch — the route re-throws 400.
 */
export function constructStripeEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new PaymentError("Stripe webhook secret not configured", 503);
  }
  const stripe = getStripe();
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    throw new PaymentError(`Stripe webhook verification failed: ${message}`, 400);
  }
}
