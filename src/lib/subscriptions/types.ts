/**
 * Shared subscription types. Provider-specific code writes into this
 * shape so the route + DB layer stays unaware of whether the purchase
 * came from Apple, Google, Stripe, or Iyzico.
 */
import type {
  SubscriptionStatus,
  SubscriptionProvider,
  Plan,
} from "@prisma/client";

export interface VerifiedPurchase {
  provider: SubscriptionProvider;
  /** Provider-side unique id of the subscription (for dedupe + webhooks). */
  providerSubId: string;
  /** The Plan row this purchase corresponds to — matched by productId. */
  plan: Plan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  /** Set when the user or store has canceled; access keeps until periodEnd. */
  canceledAt?: Date | null;
  /** Truthy when the purchase was refunded. Access lost immediately. */
  refundedAt?: Date | null;
  /** Raw provider payload to store for debugging. No card data. */
  providerMeta?: unknown;
}

export class SubscriptionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SubscriptionError";
    this.status = status;
  }
}
