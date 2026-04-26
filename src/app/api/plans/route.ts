import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getUserId } from "@/src/lib/auth";
import { getEffectiveAccess } from "@/src/lib/subscriptions";
import { logger } from "@/src/lib/logger";

/**
 * GET /api/plans
 *
 * Returns the active plan catalog. Response shape matches what the
 * pricing page needs to render three cards: free / pro / business,
 * with per-interval prices and per-currency values.
 *
 * When the caller is authenticated we also return `activePlan` so the
 * UI can highlight "current plan" and switch the primary CTA label
 * ("Upgrade" vs "Current plan").
 *
 * The feature flags come straight from the seed config — the mobile
 * client decides how to render them (labels in Turkish, icons, etc).
 */
export async function GET(req: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
      select: {
        id: true,
        tier: true,
        interval: true,
        name: true,
        description: true,
        features: true,
        priceUsd: true,
        priceEur: true,
        priceTry: true,
        applePriceId: true,
        googlePriceId: true,
        stripePriceId: true,
      },
    });

    const userId = getUserId(req);
    let activeTier: "FREE" | "PRO" | "BUSINESS" = "FREE";
    let activeSubscription: unknown = null;
    if (userId) {
      // getEffectiveAccess can fail in dev if the SubscriptionSettings
      // table or the FREE plan row hasn't been seeded yet. Don't block
      // the pricing page over that — fall back to FREE and log loudly
      // so the cause shows up in the server console.
      try {
        const access = await getEffectiveAccess(userId);
        activeTier = access.tier;
        activeSubscription = access.subscription;
      } catch (innerErr) {
        logger.error("plans_effective_access_failed", {
          userId,
          error: innerErr instanceof Error ? innerErr.message : String(innerErr),
        });
      }
    }

    return NextResponse.json({
      plans,
      activeTier,
      activeSubscription,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    logger.error("plans_route_failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
