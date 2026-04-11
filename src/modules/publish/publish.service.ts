import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { RenderService, RenderOutput } from "../render/render.service";
import { logger } from "@/src/lib/logger";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Production: /var/www/sites/  |  Dev: {cwd}/public/sites/
const SITES_DIR = process.env.SITES_DIR || path.join(process.cwd(), "public", "sites");

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const renderService = new RenderService();

export class PublishService {
  /**
   * Generate static HTML and write to disk.
   * Called after admin approves a project.
   *
   * Flow:
   * 1. Render HTML from publishedContent
   * 2. Write to temp file
   * 3. Atomic swap: temp → final path
   *
   * Directory structure:
   *   /var/www/sites/{subdomain}/index.html
   *   /var/www/sites/{subdomain}/assets/  (future: CSS, images)
   */
  async publishToStatic(project: {
    id: string;
    theme: string;
    subdomain: string | null;
    customDomain: string | null;
    publishedContent: unknown;
  }): Promise<{ path: string; size: number }> {
    const siteDir = this.getSiteDir(project);
    if (!siteDir) {
      throw new PublishError("Project has no subdomain or custom domain", 400);
    }

    // 1. Render HTML
    const rendered = await renderService.renderTheme({
      theme: project.theme,
      content: project.publishedContent as Record<string, unknown>,
    });

    // 2. Write to temp file first (atomic deploy)
    const tempDir = path.join(os.tmpdir(), `site-${project.id}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, "index.html");
    await fs.writeFile(tempFile, rendered.html, "utf-8");

    // 3. Ensure target directory exists
    await fs.mkdir(siteDir, { recursive: true });

    // 4. Atomic swap: move temp file to final location
    const finalFile = path.join(siteDir, "index.html");
    await fs.rename(tempFile, finalFile);

    // Cleanup temp dir
    await fs.rmdir(tempDir).catch(() => {});

    const stats = await fs.stat(finalFile);

    logger.info("Site published to static", {
      projectId: project.id,
      subdomain: project.subdomain,
      customDomain: project.customDomain,
      path: finalFile,
      size: stats.size,
    });

    return { path: finalFile, size: stats.size };
  }

  /**
   * Remove static files for a project (on delete or unpublish).
   */
  async removeStatic(project: {
    subdomain: string | null;
    customDomain: string | null;
  }): Promise<void> {
    const siteDir = this.getSiteDir(project);
    if (!siteDir) return;

    try {
      await fs.rm(siteDir, { recursive: true, force: true });
      logger.info("Static site removed", { path: siteDir });
    } catch {
      // Directory might not exist — ignore
    }
  }

  /**
   * Get the directory path for a project's static site.
   */
  private getSiteDir(project: {
    subdomain: string | null;
    customDomain: string | null;
  }): string | null {
    const dirName = project.subdomain || project.customDomain;
    if (!dirName) return null;
    // Sanitize directory name
    const safe = dirName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
    return path.join(SITES_DIR, safe);
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class PublishError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PublishError";
    this.status = status;
  }
}
