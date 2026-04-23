import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getUserId } from "@/src/lib/auth";
import { getEffectiveAccess } from "@/src/lib/subscriptions";

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
      const access = await getEffectiveAccess(userId);
      activeTier = access.tier;
      activeSubscription = access.subscription;
    }

    return NextResponse.json({
      plans,
      activeTier,
      activeSubscription,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
