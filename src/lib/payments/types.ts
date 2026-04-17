/**
 * Shared payment provider surface. Both Stripe and Iyzico wrappers expose
 * the same shape so the route layer doesn't care which one runs. When the
 * product evolves (subscriptions, marketplaces), new capabilities get added
 * here rather than leaked into the routes.
 */
export type PaymentProviderName = "stripe" | "iyzico";

export interface CreateIntentInput {
  userId: string;
  amount: number; // smallest unit (cents / kuruş)
  currency: string; // ISO-4217 uppercase
  purpose: string; // e.g. "premium_theme:gradient"
  customerEmail: string;
  customerName: string;
  // If present, the provider will attempt to reuse a saved card. Populated
  // from User.stripeCustomerId / iyzicoCardUserKey.
  savedCustomerRef?: string | null;
  // Mobile clients need a redirect URL for Iyzico's 3-D secure flow and
  // Stripe's return_url. Web clients pass their own.
  returnUrl: string;
}

export interface IntentResult {
  provider: PaymentProviderName;
  // Stable DB id of the Payment row we just created.
  paymentId: string;
  // Client-side action. For Stripe this is the PaymentSheet clientSecret,
  // for Iyzico it's a hosted-checkout redirect URL.
  clientAction:
    | { kind: "stripe_payment_sheet"; clientSecret: string; customerId: string; ephemeralKey: string; publishableKey: string }
    | { kind: "iyzico_redirect"; url: string; token: string };
}

export interface RefundInput {
  paymentId: string;
  providerTxnId: string;
  amount: number; // smallest unit; equal to original for full refund
  reason?: string;
}

export interface RefundResult {
  refundedAt: Date;
  providerRefundId: string;
}

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
  }
}
