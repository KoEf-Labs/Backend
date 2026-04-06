import fs from "fs";
import path from "path";
import { MemoryCache } from "@/src/lib/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThemeMeta {
  name: string;
  hasSchema: boolean;
  hasMockData: boolean;
  hasLayout: boolean;
}

export interface ThemeDetail extends ThemeMeta {
  schema: Record<string, unknown>;
  mockData: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cache — 5 min TTL
// ---------------------------------------------------------------------------

const themeListCache = new MemoryCache<ThemeMeta[]>(300);
const themeDetailCache = new MemoryCache<ThemeDetail>(300);
const mockDataCache = new MemoryCache<Record<string, unknown>>(300);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THEMES_DIR = path.join(process.cwd(), "themes");

function themePath(themeName: string): string {
  return path.join(THEMES_DIR, themeName);
}

function assertThemeExists(themeName: string): void {
  const dir = themePath(themeName);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new ThemeError(`Theme "${themeName}" not found`, 404);
  }
}

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ThemeService {
  getThemes(): ThemeMeta[] {
    const cached = themeListCache.get("all");
    if (cached) return cached;

    if (!fs.existsSync(THEMES_DIR)) return [];

    const themes = fs
      .readdirSync(THEMES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const dir = path.join(THEMES_DIR, d.name);
        return {
          name: d.name,
          hasSchema: fs.existsSync(path.join(dir, "schema.json")),
          hasMockData: fs.existsSync(path.join(dir, "mockData.json")),
          hasLayout: fs.existsSync(path.join(dir, "layout.tsx")),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    themeListCache.set("all", themes);
    return themes;
  }

  getTheme(themeName: string): ThemeDetail {
    const cached = themeDetailCache.get(themeName);
    if (cached) return cached;

    assertThemeExists(themeName);

    const dir = themePath(themeName);
    const detail: ThemeDetail = {
      name: themeName,
      hasSchema: fs.existsSync(path.join(dir, "schema.json")),
      hasMockData: fs.existsSync(path.join(dir, "mockData.json")),
      hasLayout: fs.existsSync(path.join(dir, "layout.tsx")),
      schema: readJson(path.join(dir, "schema.json")),
      mockData: readJson(path.join(dir, "mockData.json")),
    };

    themeDetailCache.set(themeName, detail);
    return detail;
  }

  getThemeSchema(themeName: string): Record<string, unknown> {
    // Schema is cached via getTheme
    const theme = this.getTheme(themeName);
    if (!theme.hasSchema) {
      throw new ThemeError(`Schema not found for theme "${themeName}"`, 404);
    }
    return theme.schema;
  }

  getThemeMockData(themeName: string): Record<string, unknown> {
    const cached = mockDataCache.get(themeName);
    if (cached) return cached;

    assertThemeExists(themeName);
    const mockPath = path.join(themePath(themeName), "mockData.json");
    if (!fs.existsSync(mockPath)) {
      throw new ThemeError(`Mock data not found for theme "${themeName}"`, 404);
    }

    const data = readJson(mockPath);
    mockDataCache.set(themeName, data);
    return data;
  }

  clearCache(themeName?: string): void {
    if (themeName) {
      themeDetailCache.invalidate(themeName);
      mockDataCache.invalidate(themeName);
    } else {
      themeListCache.clear();
      themeDetailCache.clear();
      mockDataCache.clear();
    }
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ThemeError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ThemeError";
    this.status = status;
  }
}
