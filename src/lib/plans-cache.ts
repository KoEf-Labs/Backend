import { prisma } from "@/src/lib/db";
import { MemoryCache } from "@/src/lib/cache";

type PlanRow = Awaited<ReturnType<typeof loadPlans>>;

const plansCache = new MemoryCache<PlanRow>(300, 1);
const PLANS_KEY = "active";

async function loadPlans() {
  return prisma.plan.findMany({
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
}

export async function getActivePlans(): Promise<PlanRow> {
  const cached = plansCache.get(PLANS_KEY);
  if (cached) return cached;
  const fresh = await loadPlans();
  plansCache.set(PLANS_KEY, fresh);
  return fresh;
}

export function invalidatePlansCache() {
  plansCache.invalidate(PLANS_KEY);
}
