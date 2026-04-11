import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { isValidThemeName } from "@/src/shared/utils";
import { MemoryCache } from "@/src/lib/cache";
import { logger } from "@/src/lib/logger";

const execFileAsync = promisify(execFile);

// HTML render cache — key: hash(theme + content), value: rendered HTML
// 10 minute TTL for published content
const renderCache = new MemoryCache<RenderOutput>(600);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderInput {
  theme: string;
  content: Record<string, unknown>;
}

export interface RenderOutput {
  html: string;
  theme: string;
  title: string;
  renderedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THEMES_DIR = path.join(process.cwd(), "themes");
const WORKER_PATH = path.join(
  process.cwd(),
  "src",
  "workers",
  "render-worker.tsx"
);

// Use local tsx binary directly instead of npx (avoids ~200ms npx overhead per spawn)
const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RenderService {
  /**
   * Build a cache key from theme + content hash.
   */
  private cacheKey(theme: string, content: Record<string, unknown>): string {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(content))
      .digest("hex");
    return `${theme}:${hash}`;
  }

  /**
   * Render a theme with content JSON → full HTML.
   * Uses in-memory cache to avoid re-rendering identical content.
   */
  async renderTheme(input: RenderInput): Promise<RenderOutput> {
    const { theme, content } = input;

    this.assertThemeExists(theme);

    // Check cache
    const key = this.cacheKey(theme, content);
    const cached = renderCache.get(key);
    if (cached) return cached;

    try {
      const child = execFileAsync(
        TSX_BIN,
        [WORKER_PATH, theme, "stdin"],
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024, // 10MB
          timeout: 15000,
        }
      );

      // Write content JSON to stdin
      child.child.stdin?.write(JSON.stringify(content));
      child.child.stdin?.end();

      const { stdout, stderr } = await child;

      if (stderr) {
        try {
          const err = JSON.parse(stderr);
          throw new RenderError(err.error || "Render worker error", 500);
        } catch (e) {
          if (e instanceof RenderError) throw e;
          // stderr wasn't valid JSON — return generic message (don't leak internal paths)
          logger.error("[RenderService] Worker stderr:", stderr.slice(0, 500));
          throw new RenderError("Render failed. Please try again.", 500);
        }
      }

      const heroData = content.hero as Record<string, unknown> | undefined;
      const navData = content.navbar as Record<string, unknown> | undefined;

      const result: RenderOutput = {
        html: stdout,
        theme,
        title:
          (heroData?.title as string) ||
          (navData?.logo as string) ||
          "Website",
        renderedAt: new Date().toISOString(),
      };

      // Cache the result
      renderCache.set(key, result);
      return result;
    } catch (e: unknown) {
      if (e instanceof RenderError) throw e;
      const message = e instanceof Error ? e.message : String(e);
      throw new RenderError(`Render failed for "${theme}": ${message}`, 500);
    }
  }

  /**
   * Invalidate render cache for a specific project's content.
   * Called after publish/approve to force re-render.
   */
  invalidateCache(theme?: string, content?: Record<string, unknown>): void {
    if (theme && content) {
      renderCache.invalidate(this.cacheKey(theme, content));
    } else {
      renderCache.clear();
    }
  }

  /**
   * Render using mockData.json (for previews).
   */
  async renderPreview(theme: string): Promise<RenderOutput> {
    this.assertThemeExists(theme);

    const mockPath = path.join(THEMES_DIR, theme, "mockData.json");
    if (!fs.existsSync(mockPath)) {
      throw new RenderError(`Mock data not found for "${theme}"`, 404);
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        TSX_BIN,
        [WORKER_PATH, theme, "preview"],
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
          timeout: 15000,
        }
      );

      if (stderr) {
        try {
          const err = JSON.parse(stderr);
          throw new RenderError(err.error || "Render worker error", 500);
        } catch (e) {
          if (e instanceof RenderError) throw e;
          logger.error("[RenderService] Preview stderr:", stderr.slice(0, 500));
          throw new RenderError("Render failed. Please try again.", 500);
        }
      }

      const mockData = JSON.parse(fs.readFileSync(mockPath, "utf-8"));
      const heroData = mockData.hero as Record<string, unknown> | undefined;
      const navData = mockData.navbar as Record<string, unknown> | undefined;

      return {
        html: stdout,
        theme,
        title:
          (heroData?.title as string) ||
          (navData?.logo as string) ||
          "Website",
        renderedAt: new Date().toISOString(),
      };
    } catch (e: unknown) {
      if (e instanceof RenderError) throw e;
      const message = e instanceof Error ? e.message : String(e);
      throw new RenderError(`Preview failed for "${theme}": ${message}`, 500);
    }
  }

  private assertThemeExists(theme: string): void {
    if (!isValidThemeName(theme)) {
      throw new RenderError(`Invalid theme name`, 400);
    }
    const dir = path.join(THEMES_DIR, theme);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new RenderError(`Theme "${theme}" not found`, 404);
    }
  }
}

export class RenderError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RenderError";
    this.status = status;
  }
}
