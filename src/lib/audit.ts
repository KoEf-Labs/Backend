import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { logger } from "./logger";

/**
 * Audit log helper — single source of truth for admin actions.
 *
 * Written from:
 *  - Backend internal routes (approve/reject/suspend/…) directly via writeAudit()
 *  - AdminBackend via POST /api/internal/audit-log (proxies through to this helper)
 *
 * Reads go through GET /api/internal/audit-log — AdminBackend history pages
 * read from here instead of its own DB.
 */

export type AuditAction =
  | "approve"
  | "reject"
  | "unpublish"
  | "delete_project"
  | "suspend_user"
  | "unsuspend_user"
  | "verify_user_email"
  | "reset_user_password"
  | "create_admin"
  | "delete_admin"
  | "change_admin_password"
  | "update_settings"
  | "view_logs"
  | "toggle_maintenance";

export type AuditTargetType = "project" | "user" | "admin" | "system";

export interface AuditEntry {
  adminId: string;
  adminEmail: string;
  action: AuditAction | string;
  targetType: AuditTargetType | string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId,
        adminEmail: entry.adminEmail,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata
          ? (entry.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    // Audit write failures should not break the action itself — just log loudly.
    logger.error("audit_write_failed", {
      error: e instanceof Error ? e.message : String(e),
      entry: {
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
      },
    });
  }
}
