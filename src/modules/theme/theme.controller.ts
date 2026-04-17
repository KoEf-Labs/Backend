import { NextRequest, NextResponse } from "next/server";
import { ThemeService, ThemeError } from "./theme.service";
import { getUserId } from "@/src/lib/auth";

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

    // If a user is authenticated, pull their entitlements once.
    const userId = req ? getUserId(req) : null;
    const owned = new Set<string>();
    if (userId) {
      const ent = await prisma.userThemeEntitlement.findMany({
        where: { userId },
        select: { themeName: true },
      });
      for (const e of ent) owned.add(e.themeName);
    }

    const enriched = filtered.map((t) => {
      const cfg = byName.get(t.name);
      const isPremium = cfg?.isPremium ?? false;
      return {
        ...t,
        isPremium,
        priceTry: cfg?.priceTry ?? null,
        priceUsd: cfg?.priceUsd ?? null,
        owned: isPremium ? owned.has(t.name) : true,
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
