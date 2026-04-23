/**
 * Seed the initial Plan catalog. Idempotent — re-running updates prices
 * if they changed, never creates duplicates.
 *
 * Run with:  npx tsx prisma/seed-plans.ts
 *
 * Store product IDs (applePriceId / googlePriceId / stripePriceId) are
 * intentionally left null here — fill them via the admin panel or a
 * follow-up migration once the App Store Connect / Play Console / Stripe
 * products are configured. The mobile app will use whichever of the
 * three matches the running platform.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PlanSeed {
  tier: "FREE" | "PRO" | "BUSINESS";
  interval: "MONTHLY" | "YEARLY" | "LIFETIME";
  name: string;
  description: string;
  features: Record<string, unknown>;
  priceUsd: number | null; // cents
  priceEur: number | null;
  priceTry: number | null; // kuruş
  sortOrder: number;
}

// Feature flags. The mobile client reads these to render the comparison
// grid and to gate UI (disabled inputs on free, watermark on free, etc).
// Only keys we actually enforce today — placeholder "membership" /
// "ecommerce" / "ai" land as "coming_soon" so the UI can show a chip
// without enforcing anything yet.
const proFeatures = {
  pages: "unlimited",
  domain: "custom",
  ads: false,
  branding: false,
  themes: "premium",
  seo: "basic",
  ecommerce: "coming_soon",
  membership: "coming_soon",
  analytics: "limited",
  storage: "limited",
  ai: false,
};

const businessFeatures = {
  ...proFeatures,
  seo: "advanced",
  ecommerce: "coming_soon",
  membership: "coming_soon",
  analytics: "advanced",
  storage: "extended",
  ai: "optional",
  performance: "higher",
};

const freeFeatures = {
  pages: 3,
  domain: "subdomain",
  ads: true,
  branding: true,
  themes: "standard",
  seo: false,
  ecommerce: false,
  membership: false,
  analytics: false,
  storage: "limited",
  ai: false,
};

const seeds: PlanSeed[] = [
  {
    tier: "FREE",
    interval: "LIFETIME",
    name: "Free",
    description: "Başlamak için ücretsiz — alt alan, 3 sayfa, standart temalar.",
    features: freeFeatures,
    priceUsd: 0,
    priceEur: 0,
    priceTry: 0,
    sortOrder: 0,
  },
  {
    tier: "PRO",
    interval: "MONTHLY",
    name: "Pro · Aylık",
    description: "Sınırsız sayfa, özel alan adı, premium temalar.",
    features: proFeatures,
    priceUsd: 299, // $2.99
    priceEur: 299, // €2.99
    priceTry: 13000, // ₺130.00
    sortOrder: 1,
  },
  {
    tier: "PRO",
    interval: "YEARLY",
    name: "Pro · Yıllık",
    description: "Yıllık ödeyince 2 ay bedava — en çok tercih edilen.",
    features: proFeatures,
    priceUsd: 1999, // $19.99
    priceEur: 1999,
    priceTry: 90000, // ₺900.00
    sortOrder: 2,
  },
  {
    tier: "BUSINESS",
    interval: "MONTHLY",
    name: "Business · Aylık",
    description:
      "Gelişmiş SEO, yüksek performans, genişletilmiş depolama.",
    features: businessFeatures,
    priceUsd: 799, // $7.99
    priceEur: 799,
    priceTry: 34900, // ₺349.00
    sortOrder: 3,
  },
  {
    tier: "BUSINESS",
    interval: "YEARLY",
    name: "Business · Yıllık",
    description: "Tüm Business özellikleri + 2 ay bedava.",
    features: businessFeatures,
    priceUsd: 5499, // $54.99
    priceEur: 5499,
    priceTry: 239900, // ₺2399.00
    sortOrder: 4,
  },
];

async function main() {
  for (const p of seeds) {
    const existing = await prisma.plan.findUnique({
      where: { tier_interval: { tier: p.tier, interval: p.interval } },
    });
    if (existing) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          description: p.description,
          features: p.features,
          priceUsd: p.priceUsd,
          priceEur: p.priceEur,
          priceTry: p.priceTry,
          sortOrder: p.sortOrder,
          active: true,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`updated: ${p.name}`);
    } else {
      await prisma.plan.create({ data: p });
      // eslint-disable-next-line no-console
      console.log(`created: ${p.name}`);
    }
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
