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
import { MemoryCache } from "@/src/lib/cache";
import { SubscriptionError, VerifiedPurchase } from "./types";

export { SubscriptionError };

type EffectiveAccess = Awaited<ReturnType<typeof loadEffectiveAccess>>;
type SubscriptionSettingsRow = Awaited<
  ReturnType<typeof prisma.subscriptionSettings.upsert>
>;

// Per-user effective-access cache. Public site renders call this on every
// request to gate Free-tier section limits — a 60s TTL trades a tiny bit of
// staleness for a big drop in DB pressure on hot sites. Invalidated on every
// mutation that can change a user's tier (sync/extend/cancel/sweep).
const accessCache = new MemoryCache<EffectiveAccess>(60, 5000);

// Singleton settings — changes only via admin PATCH. 5-minute TTL is plenty.
const settingsCache = new MemoryCache<SubscriptionSettingsRow>(300, 1);
const SETTINGS_KEY = "default";

export function invalidateAccessCache(userId?: string) {
  if (userId) accessCache.invalidate(userId);
  else accessCache.clear();
}

export function invalidateSubscriptionSettingsCache() {
  settingsCache.invalidate(SETTINGS_KEY);
}

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

  // Stamp the grace window when the row transitions into a state that
  // needs one. Only set it on the edge (was non-grace → now grace) —
  // if the row is already PAST_DUE we leave the stamp alone so the
  // clock doesn't reset on every webhook during the grace window.
  const needsGrace =
    (verified.status === "PAST_DUE" || verified.status === "CANCELED") &&
    (!existing || (existing.status !== "PAST_DUE" && existing.status !== "CANCELED"));

  let graceEndsAt: Date | null | undefined;
  if (needsGrace) {
    const settings = await getSubscriptionSettings();
    graceEndsAt = new Date(
      Date.now() + settings.gracePeriodDays * 24 * 60 * 60 * 1000
    );
  } else if (verified.status === "ACTIVE" || verified.status === "TRIALING") {
    // Successful renewal / reactivation — clear any pending grace.
    graceEndsAt = null;
  } else if (verified.status === "EXPIRED" || verified.status === "REFUNDED") {
    graceEndsAt = null;
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
    ...(graceEndsAt !== undefined ? { graceEndsAt } : {}),
    providerMeta: (verified.providerMeta as object) ?? undefined,
  };

  const sub = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.subscription.create({ data });

  invalidateAccessCache(userId);

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
 * tier (BUSINESS > PRO > FREE) among those still within their period
 * or within their grace window (PAST_DUE / CANCELED users keep tier
 * until graceEndsAt).
 *
 * Returns a synthetic FREE row when nothing is active.
 */
export async function getEffectiveAccess(userId: string) {
  const cached = accessCache.get(userId);
  if (cached) return cached;
  const fresh = await loadEffectiveAccess(userId);
  accessCache.set(userId, fresh);
  return fresh;
}

async function loadEffectiveAccess(userId: string) {
  const now = new Date();
  const rows = await prisma.subscription.findMany({
    where: {
      userId,
      refundedAt: null,
      OR: [
        // Happy path — currently paid for.
        {
          status: { in: ["ACTIVE", "TRIALING"] },
          currentPeriodEnd: { gt: now },
        },
        // Failed renewal / user canceled — tier sticks around while
        // inside the admin-configured grace window.
        {
          status: { in: ["PAST_DUE", "CANCELED"] },
          graceEndsAt: { gt: now },
        },
      ],
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

/**
 * Fetch the single app-wide subscription settings row, creating it with
 * defaults if it doesn't exist yet. Always returns a row so callers
 * don't need to null-check.
 */
export async function getSubscriptionSettings() {
  const cached = settingsCache.get(SETTINGS_KEY);
  if (cached) return cached;
  const row = await prisma.subscriptionSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  settingsCache.set(SETTINGS_KEY, row);
  return row;
}

/**
 * Sweep — meant to be called by a cron. Moves subscriptions whose
 * billing period ended into EXPIRED (or grace if applicable), and
 * drops grace-window PAST_DUE/CANCELED rows into EXPIRED once their
 * graceEndsAt has passed. Idempotent.
 */
export async function sweepExpiredSubscriptions() {
  const now = new Date();
  const settings = await getSubscriptionSettings();

  // 1. Paid periods that ended without a renewal payload: flip to
  //    PAST_DUE and start the grace clock. If webhook already put them
  //    in PAST_DUE, currentPeriodEnd is still in the past so we'd pick
  //    them up here too — use graceEndsAt absence as the "not yet
  //    grace'd" signal so we don't re-stamp.
  const toPastDue = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { lte: now },
      refundedAt: null,
    },
    select: { id: true },
  });
  if (toPastDue.length > 0) {
    const graceEndsAt = new Date(
      now.getTime() + settings.gracePeriodDays * 24 * 60 * 60 * 1000
    );
    await prisma.subscription.updateMany({
      where: { id: { in: toPastDue.map((r) => r.id) } },
      data: { status: "PAST_DUE", graceEndsAt },
    });
  }

  // 2. Rows whose grace already ended → EXPIRED (no more access).
  const toExpire = await prisma.subscription.updateMany({
    where: {
      status: { in: ["PAST_DUE", "CANCELED"] },
      graceEndsAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  // 3. CANCELED rows that simply ran out their paid period (graceEndsAt
  //    null means cancel-at-period-end with no added grace) → EXPIRED.
  const canceledExpired = await prisma.subscription.updateMany({
    where: {
      status: "CANCELED",
      graceEndsAt: null,
      currentPeriodEnd: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  // Sweep can change tier for any number of users — clear the whole
  // access cache rather than re-querying who got affected.
  if (toPastDue.length > 0 || toExpire.count > 0 || canceledExpired.count > 0) {
    invalidateAccessCache();
  }

  logger.info("subscription_sweep", {
    pastDue: toPastDue.length,
    expired: toExpire.count + canceledExpired.count,
  });

  return {
    pastDue: toPastDue.length,
    expired: toExpire.count + canceledExpired.count,
  };
}

/**
 * Admin action — extend the current period by N days. Use for comping
 * an affected user or honouring a manual refund reversal. Also clears
 * any grace window and sets status back to ACTIVE.
 */
export async function extendSubscription(
  subscriptionId: string,
  days: number
) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) throw new SubscriptionError("Subscription not found", 404);

  const base = sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
  const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      currentPeriodEnd: newEnd,
      status: "ACTIVE",
      graceEndsAt: null,
      canceledAt: null,
    },
  });
  invalidateAccessCache(updated.userId);
  return updated;
}

/**
 * Admin action — mark canceled. Respects the grace period from
 * settings so the user keeps their tier until grace runs out.
 */
export async function cancelSubscriptionNow(subscriptionId: string) {
  const settings = await getSubscriptionSettings();
  const graceEndsAt = new Date(
    Date.now() + settings.gracePeriodDays * 24 * 60 * 60 * 1000
  );
  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      graceEndsAt,
    },
  });
  invalidateAccessCache(updated.userId);
  return updated;
}
