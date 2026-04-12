import { NextRequest, NextResponse } from "next/server";
import { ThemeService, ThemeError } from "./theme.service";

const service = new ThemeService();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/themes → list all themes
export async function handleListThemes() {
  try {
    const themes = service.getThemes();
    // Filter out admin-disabled themes so mobile users don't see them
    const { prisma } = await import("@/src/lib/db");
    const disabled = await prisma.themeConfig.findMany({
      where: { enabled: false },
      select: { name: true },
    });
    const disabledSet = new Set(disabled.map((t) => t.name));
    const filtered = (themes as Array<{ name: string }>).filter(
      (t) => !disabledSet.has(t.name)
    );
    return json({ themes: filtered });
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
