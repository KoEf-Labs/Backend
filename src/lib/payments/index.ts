/**
 * Payment provider router. The route layer calls `createPaymentIntent`
 * without caring which backend runs; this module picks Stripe vs Iyzico
 * based on the user's country + the currency they're paying in.
 *
 * Rule:  country === "TR" OR currency === "TRY"  → Iyzico
 *        otherwise                                 → Stripe
 *
 * The caller (the API route) can also force a provider via input.provider
 * — useful for AdminBackend tools and support overrides.
 */
import { prisma } from "@/src/lib/db";
import { revokeEntitlementsForPayment } from "@/src/lib/entitlements";
import { createIyzicoIntent, refundIyzico } from "./iyzico";
import { createStripeIntent, refundStripe } from "./stripe";
import {
  CreateIntentInput,
  IntentResult,
  PaymentError,
  PaymentProviderName,
  RefundInput,
  RefundResult,
} from "./types";

export function pickProvider(args: {
  country: string | null;
  currency: string;
  override?: PaymentProviderName;
}): PaymentProviderName {
  if (args.override) return args.override;
  if (args.currency.toUpperCase() === "TRY") return "iyzico";
  if (args.country === "TR") return "iyzico";
  return "stripe";
}

export async function createPaymentIntent(args: {
  userId: string;
  amount: number;
  currency: string;
  purpose: string;
  returnUrl: string;
  provider?: PaymentProviderName;
}): Promise<IntentResult> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      id: true,
      email: true,
      name: true,
      country: true,
      stripeCustomerId: true,
      iyzicoCardUserKey: true,
    },
  });
  if (!user) throw new PaymentError("User not found", 404);

  const provider = pickProvider({
    country: user.country,
    currency: args.currency,
    override: args.provider,
  });

  const base: CreateIntentInput = {
    userId: user.id,
    amount: args.amount,
    currency: args.currency,
    purpose: args.purpose,
    customerEmail: user.email,
    customerName: user.name,
    returnUrl: args.returnUrl,
    savedCustomerRef:
      provider === "stripe"
        ? user.stripeCustomerId
        : user.iyzicoCardUserKey,
  };

  if (provider === "stripe") return createStripeIntent(base);
  return createIyzicoIntent(base);
}

export async function refundPayment(args: {
  paymentId: string;
  reason?: string;
}): Promise<RefundResult & { provider: PaymentProviderName }> {
  const payment = await prisma.payment.findUnique({
    where: { id: args.paymentId },
  });
  if (!payment) throw new PaymentError("Payment not found", 404);
  if (payment.status !== "SUCCEEDED") {
    throw new PaymentError(
      `Cannot refund a payment in state ${payment.status}`,
      400
    );
  }
  if (!payment.providerTxnId) {
    throw new PaymentError("Payment has no provider transaction id", 400);
  }

  const input: RefundInput = {
    paymentId: payment.id,
    providerTxnId: payment.providerTxnId,
    amount: payment.amount,
    reason: args.reason,
  };

  const result =
    payment.provider === "STRIPE"
      ? await refundStripe(input)
      : await refundIyzico(input);

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      refundedAt: result.refundedAt,
      refundReason: args.reason ?? null,
    },
  });

  // Pull back anything this payment unlocked (premium themes etc.). Safe
  // to call even when nothing was granted — it's a no-op then.
  await revokeEntitlementsForPayment(payment.id);

  return {
    ...result,
    provider: payment.provider === "STRIPE" ? "stripe" : "iyzico",
  };
}

export { PaymentError } from "./types";
