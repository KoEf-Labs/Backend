import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { redis, isRedisAvailable } from "@/src/lib/redis";
import { writeAudit } from "@/src/lib/audit";

const MAINTENANCE_KEY = "maintenance:enabled";
const MAINTENANCE_MSG_KEY = "maintenance:message";
const THEMES_DIR = path.join(process.cwd(), "themes");

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface RateLimitSettings {
  authPerMinute: number;
  heavyPerMinute: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitSettings = {
  authPerMinute: 5,
  heavyPerMinute: 10,
};

export class ModerationService {
  // ── Settings ──────────────────────────────────────────────────────

  async getSetting<T>(key: string, fallback: T): Promise<T> {
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return fallback;
    return row.value as T;
  }

  async setSetting(
    key: string,
    value: unknown,
    admin: { id: string; email: string }
  ): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "update_settings",
      targetType: "system",
      targetId: key,
      metadata: { key, value },
    });
  }

  async getRateLimits(): Promise<RateLimitSettings> {
    return this.getSetting("rate_limits", DEFAULT_RATE_LIMITS);
  }

  async updateRateLimits(
    patch: Partial<RateLimitSettings>,
    admin: { id: string; email: string }
  ): Promise<RateLimitSettings> {
    const current = await this.getRateLimits();
    const next = {
      authPerMinute: clamp(
        patch.authPerMinute ?? current.authPerMinute,
        1,
        100
      ),
      heavyPerMinute: clamp(
        patch.heavyPerMinute ?? current.heavyPerMinute,
        1,
        100
      ),
    };
    await this.setSetting("rate_limits", next, admin);
    return next;
  }

  // ── Maintenance mode (Redis flag) ─────────────────────────────────

  async getMaintenance(): Promise<{ enabled: boolean; message: string | null }> {
    if (!redis || !isRedisAvailable()) {
      return { enabled: false, message: null };
    }
    try {
      const [enabled, message] = await Promise.all([
        redis.get(MAINTENANCE_KEY),
        redis.get(MAINTENANCE_MSG_KEY),
      ]);
      return {
        enabled: enabled === "1",
        message: message ?? null,
      };
    } catch {
      return { enabled: false, message: null };
    }
  }

  async setMaintenance(
    enabled: boolean,
    message: string | null,
    admin: { id: string; email: string }
  ): Promise<void> {
    if (!redis || !isRedisAvailable()) {
      throw new Error("Redis unavailable — cannot toggle maintenance");
    }
    if (enabled) {
      await redis.set(MAINTENANCE_KEY, "1");
      if (message) {
        await redis.set(MAINTENANCE_MSG_KEY, message.slice(0, 500));
      } else {
        await redis.del(MAINTENANCE_MSG_KEY);
      }
    } else {
      await redis.del(MAINTENANCE_KEY);
      await redis.del(MAINTENANCE_MSG_KEY);
    }
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "toggle_maintenance",
      targetType: "system",
      targetId: "maintenance",
      metadata: { enabled, message },
    });
  }

  // ── Domain blacklist ──────────────────────────────────────────────

  async listBlacklist() {
    return prisma.domainBlacklist.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async addBlacklistEntry(
    pattern: string,
    reason: string | null,
    admin: { id: string; email: string }
  ) {
    const cleaned = pattern.trim().toLowerCase();
    if (!cleaned) throw new Error("Pattern boş olamaz");
    if (cleaned.length > 200) throw new Error("Pattern çok uzun");

    const entry = await prisma.domainBlacklist.create({
      data: {
        pattern: cleaned,
        reason: reason?.slice(0, 500) || null,
        addedBy: admin.email,
      },
    });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "update_settings",
      targetType: "system",
      targetId: "domain_blacklist",
      metadata: { operation: "add", pattern: cleaned, reason },
    });
    return entry;
  }

  async removeBlacklistEntry(
    id: string,
    admin: { id: string; email: string }
  ): Promise<void> {
    const entry = await prisma.domainBlacklist.findUnique({ where: { id } });
    if (!entry) throw new Error("Kayıt bulunamadı");
    await prisma.domainBlacklist.delete({ where: { id } });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "update_settings",
      targetType: "system",
      targetId: "domain_blacklist",
      metadata: { operation: "remove", pattern: entry.pattern },
    });
  }

  async isSubdomainBlocked(subdomain: string): Promise<string | null> {
    const cleaned = subdomain.trim().toLowerCase();
    if (!cleaned) return null;
    // Exact match
    const exact = await prisma.domainBlacklist.findUnique({
      where: { pattern: cleaned },
    });
    if (exact) return exact.reason || "Bu alt alan adı engellenmiş";

    // Regex entries prefixed with "re:"
    const regexEntries = await prisma.domainBlacklist.findMany({
      where: { pattern: { startsWith: "re:" } },
      select: { pattern: true, reason: true },
    });
    for (const entry of regexEntries) {
      try {
        const re = new RegExp(entry.pattern.slice(3));
        if (re.test(cleaned)) return entry.reason || "Bu alt alan adı engellenmiş";
      } catch {
        // invalid regex — skip
      }
    }
    return null;
  }

  // ── Theme management ─────────────────────────────────────────────

  async listThemes() {
    // Discover themes from disk, then enrich with DB flags
    const dirents = await fs
      .readdir(THEMES_DIR, { withFileTypes: true })
      .catch(() => []);
    const names = dirents
      .filter((d) => d.isDirectory() && d.name !== "shared")
      .map((d) => d.name)
      .sort();

    const configs = await prisma.themeConfig.findMany({
      where: { name: { in: names } },
    });
    const configMap = new Map(configs.map((c) => [c.name, c]));

    return names.map((name) => {
      const c = configMap.get(name);
      return {
        name,
        enabled: c ? c.enabled : true,
        disabledBy: c?.disabledBy ?? null,
        disabledReason: c?.disabledReason ?? null,
        updatedAt: c?.updatedAt ?? null,
      };
    });
  }

  async setThemeEnabled(
    name: string,
    enabled: boolean,
    reason: string | null,
    admin: { id: string; email: string }
  ) {
    // Validate theme directory exists
    const themeDir = path.join(THEMES_DIR, name);
    const stat = await fs.stat(themeDir).catch(() => null);
    if (!stat?.isDirectory()) throw new Error("Tema bulunamadı");

    const entry = await prisma.themeConfig.upsert({
      where: { name },
      create: {
        name,
        enabled,
        disabledBy: enabled ? null : admin.email,
        disabledReason: enabled ? null : reason,
      },
      update: {
        enabled,
        disabledBy: enabled ? null : admin.email,
        disabledReason: enabled ? null : reason,
      },
    });
    await writeAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "update_settings",
      targetType: "system",
      targetId: `theme:${name}`,
      metadata: { enabled, reason },
    });
    return entry;
  }

  async isThemeEnabled(name: string): Promise<boolean> {
    const cfg = await prisma.themeConfig.findUnique({ where: { name } });
    if (!cfg) return true; // missing row = enabled by default
    return cfg.enabled;
  }

  // ── PM2 logs reader (admin panel log viewer) ─────────────────────

  async readLogs(
    source: "api" | "admin" | "cleanup" | "aggregate",
    lines: number
  ): Promise<string> {
    const logFiles: Record<string, string> = {
      api: "/var/log/pm2/api-out.log",
      admin: "/var/log/pm2/admin-out.log",
      cleanup: "/var/log/pm2/cleanup-out.log",
      aggregate: "/var/log/pm2/aggregate-out.log",
    };

    // In local dev the PM2 logs don't exist — fall back to the dev server's
    // stdout? No — just report a friendly message.
    const file = logFiles[source];
    if (!file) throw new Error("Geçersiz log kaynağı");

    const exists = await fs
      .stat(file)
      .then((s) => s.isFile())
      .catch(() => false);
    if (!exists) {
      return `# ${source} log bulunamadı (${file})\n# Local dev'de PM2 çalışmıyor olabilir.`;
    }

    const cappedLines = Math.min(1000, Math.max(10, lines));
    // Read whole file then tail — OK for log files up to ~10MB
    try {
      const content = await fs.readFile(file, "utf-8");
      const allLines = content.split("\n");
      const tail = allLines.slice(-cappedLines).join("\n");
      return maskSensitive(tail);
    } catch (e) {
      return `# Log okunamadı: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Redact sensitive patterns from log output before exposing it via the
 * admin panel. JWT tokens, bcrypt hashes, emails, and Authorization
 * headers are masked.
 */
function maskSensitive(text: string): string {
  return text
    // JWT tokens (3 base64 segments separated by dots)
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[JWT_REDACTED]")
    // bcrypt hashes
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[BCRYPT_REDACTED]")
    // Authorization: Bearer
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]")
    // x-service-token header line
    .replace(/x-service-token[^\s]*/gi, "x-service-token:[REDACTED]")
    // Emails (keep domain suffix for debugging)
    .replace(
      /([a-zA-Z0-9._-]{2})[a-zA-Z0-9._-]*(@[a-zA-Z0-9.-]+)/g,
      "$1***$2"
    );
}
