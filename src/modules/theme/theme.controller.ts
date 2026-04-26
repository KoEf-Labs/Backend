import { NextRequest, NextResponse } from "next/server";
import { ThemeService, ThemeError } from "./theme.service";
import { getUserId } from "@/src/lib/auth";
import { getEffectiveAccess } from "@/src/lib/subscriptions";

const service = new ThemeService();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/themes → list all themes
// Response includes isPremium + prices for all visible themes; if the
// caller is authenticated, each premium theme carries `owned: true|false`
// so the client can render a lock vs. a "selectable" badge without a
// second round trip to /entitlements.
export async function handleListThemes(req?: NextRequest) {
  try {
    const themes = service.getThemes();
    const { prisma } = await import("@/src/lib/db");
    const configs = await prisma.themeConfig.findMany({
      select: {
        name: true,
        enabled: true,
        isPremium: true,
        priceTry: true,
        priceUsd: true,
      },
    });
    const byName = new Map(configs.map((c) => [c.name, c]));

    // Filter out admin-disabled themes so mobile users don't see them
    const filtered = themes.filter((t) => byName.get(t.name)?.enabled !== false);

    // If a user is authenticated, pull their entitlements + effective
    // subscription tier so we can decide which premium themes the user
    // already has access to (per-theme purchase OR a paid plan).
    const userId = req ? getUserId(req) : null;
    const owned = new Set<string>();
    let planUnlocksPremium = false;
    if (userId) {
      const [ent, access] = await Promise.all([
        prisma.userThemeEntitlement.findMany({
          where: { userId },
          select: { themeName: true },
        }),
        getEffectiveAccess(userId).catch(() => null),
      ]);
      for (const e of ent) owned.add(e.themeName);
      // Pro and Business include all premium themes — see plan config.
      planUnlocksPremium =
        access?.tier === "PRO" || access?.tier === "BUSINESS";
    }

    const enriched = filtered.map((t) => {
      const cfg = byName.get(t.name);
      const isPremium = cfg?.isPremium ?? false;
      const ownedByPurchase = isPremium && owned.has(t.name);
      const ownedByPlan = isPremium && planUnlocksPremium;
      return {
        ...t,
        isPremium,
        priceTry: cfg?.priceTry ?? null,
        priceUsd: cfg?.priceUsd ?? null,
        // owned = "user can pick this without paying anything more".
        // True for free themes, paid-once themes, and any premium theme
        // when the user is on a plan that bundles them.
        owned: !isPremium || ownedByPurchase || ownedByPlan,
        // includedInPlan tells the client whether the unlock came from
        // the subscription (vs an entitlement). Useful when the UI wants
        // to phrase the upsell as "Pro ile dahil" instead of "satın al".
        includedInPlan: ownedByPlan,
      };
    });

    return json({ themes: enriched });
  } catch (e) {
    if (e instanceof ThemeError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// GET /api/themes/:name → get theme detail
export async function handleGetTheme(name: string) {
  try {
    const theme = service.getTheme(name);
    return json(theme);
  } catch (e) {
    if (e instanceof ThemeError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// GET /api/themes/:name/schema → get schema only
export async function handleGetSchema(name: string) {
  try {
    const schema = service.getThemeSchema(name);
    return json({ theme: name, schema });
  } catch (e) {
    if (e instanceof ThemeError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// GET /api/themes/:name/mock → get mock data only
export async function handleGetMockData(name: string) {
  try {
    const mockData = service.getThemeMockData(name);
    return json({ theme: name, mockData });
  } catch (e) {
    if (e instanceof ThemeError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
