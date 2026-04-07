import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RenderService {
  /**
   * Render a theme with content JSON → full HTML.
   * Spawns tsx to run the render worker outside Next.js.
   */
  async renderTheme(input: RenderInput): Promise<RenderOutput> {
    const { theme, content } = input;

    this.assertThemeExists(theme);

    try {
      const child = execFileAsync(
        "npx",
        ["tsx", WORKER_PATH, theme, "stdin"],
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
          throw new RenderError(err.error, 500);
        } catch (e) {
          if (e instanceof RenderError) throw e;
        }
      }

      const heroData = content.hero as Record<string, unknown> | undefined;
      const navData = content.navbar as Record<string, unknown> | undefined;

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
      throw new RenderError(`Render failed for "${theme}": ${message}`, 500);
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
        "npx",
        ["tsx", WORKER_PATH, theme, "preview"],
        {
          cwd: process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
          timeout: 15000,
        }
      );

      if (stderr) {
        try {
          const err = JSON.parse(stderr);
          throw new RenderError(err.error, 500);
        } catch (e) {
          if (e instanceof RenderError) throw e;
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
