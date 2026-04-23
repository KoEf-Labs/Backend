/**
 * High-level subscription sync. Takes a VerifiedPurchase from any
 * provider and upserts the Subscription row so the feature gate can
 * read "am I Pro?" with a single query.
 *
 * Invariant: a user has at most ONE row per providerSubId. Different
 * providers (Apple + Stripe for the same user) live as separate rows —
 * we check effective access across all of them.
 */
import { prisma } from "@/src/lib/db";
import { logger } from "@/src/lib/logger";
import { SubscriptionError, VerifiedPurchase } from "./types";

export { SubscriptionError };

export async function syncSubscription(
  userId: string,
  verified: VerifiedPurchase
) {
  const existing = verified.providerSubId
    ? await prisma.subscription.findUnique({
        where: { providerSubId: verified.providerSubId },
      })
    : null;

  if (existing && existing.userId !== userId) {
    // Another account already owns this store transaction. Apple/Google
    // receipts are tied to the store account, so the "right" move is
    // to refuse rather than silently steal the sub. Admin can merge
    // manually if a mistake happened.
    throw new SubscriptionError(
      "This purchase is already linked to another account",
      409
    );
  }

  const data = {
    userId,
    planId: verified.plan.id,
    provider: verified.provider,
    providerSubId: verified.providerSubId,
    status: verified.status,
    currentPeriodStart: verified.currentPeriodStart,
    currentPeriodEnd: verified.currentPeriodEnd,
    canceledAt: verified.canceledAt ?? null,
    refundedAt: verified.refundedAt ?? null,
    providerMeta: (verified.providerMeta as object) ?? undefined,
  };

  const sub = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.subscription.create({ data });

  logger.info("subscription_synced", {
    userId,
    subscriptionId: sub.id,
    provider: sub.provider,
    status: sub.status,
    tier: verified.plan.tier,
  });

  return sub;
}

/**
 * Pick the best active subscription for this user. "Best" = highest
 * tier (BUSINESS > PRO > FREE) among those still within their period.
 *
 * Returns a synthetic FREE row when nothing is active — the caller can
 * treat it uniformly as "your current access".
 */
export async function getEffectiveAccess(userId: string) {
  const now = new Date();
  const rows = await prisma.subscription.findMany({
    where: {
      userId,
      currentPeriodEnd: { gt: now },
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED"] },
      refundedAt: null,
    },
    include: { plan: true },
    orderBy: { currentPeriodEnd: "desc" },
  });

  if (rows.length === 0) {
    const free = await prisma.plan.findFirst({
      where: { tier: "FREE", active: true },
    });
    return {
      tier: "FREE" as const,
      plan: free,
      subscription: null,
    };
  }

  // Highest tier wins; ties broken by latest period end.
  const order = { BUSINESS: 2, PRO: 1, FREE: 0 };
  rows.sort((a, b) => {
    const dt = order[b.plan.tier] - order[a.plan.tier];
    if (dt !== 0) return dt;
    return b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime();
  });

  return {
    tier: rows[0].plan.tier,
    plan: rows[0].plan,
    subscription: rows[0],
  };
}
