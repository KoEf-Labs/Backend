import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "./admin.service";
import { ModerationService } from "./moderation.service";
import { requireServiceToken, AuthError } from "@/src/lib/auth";
import { ProjectStatus } from "@prisma/client";
import { logger } from "@/src/lib/logger";

const service = new AdminService();
const moderationService = new ModerationService();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function guard(req: NextRequest): NextResponse | null {
  try {
    requireServiceToken(req);
    return null;
  } catch (e: unknown) {
    if (e instanceof AuthError) return error(e.message, e.status);
    return error("Forbidden", 403);
  }
}

/**
 * Admin identity: AdminBackend sends its AdminUser.id + email via headers.
 * We trust this because requireServiceToken() already verified the caller
 * is AdminBackend (not an end user).
 */
function adminFromHeaders(req: NextRequest): { id: string; email: string } {
  return {
    id: req.headers.get("x-admin-id") || "unknown",
    email: req.headers.get("x-admin-email") || "unknown",
  };
}

// ── Users ────────────────────────────────────────────────────────────

export async function handleListUsers(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const result = await service.listUsers({
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 25,
    search: searchParams.get("search") || undefined,
    suspended:
      searchParams.get("suspended") === "true"
        ? true
        : searchParams.get("suspended") === "false"
        ? false
        : undefined,
  });
  return json(result);
}

export async function handleGetUser(req: NextRequest, id: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const user = await service.getUserDetail(id);
  if (!user) return error("User not found", 404);
  return json(user);
}

export async function handleSuspendUser(req: NextRequest, id: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const admin = adminFromHeaders(req);
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason : null;

  try {
    const user = await service.suspendUser(id, reason, admin);
    logger.info("admin_action", {
      type: "admin_action",
      action: "suspend_user",
      targetId: id,
      adminId: admin.id,
    });
    return json(user);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function handleUnsuspendUser(req: NextRequest, id: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const admin = adminFromHeaders(req);
  try {
    const user = await service.unsuspendUser(id, admin);
    logger.info("admin_action", {
      type: "admin_action",
      action: "unsuspend_user",
      targetId: id,
      adminId: admin.id,
    });
    return json(user);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}

export async function handleManualVerifyEmail(req: NextRequest, id: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const admin = adminFromHeaders(req);
  try {
    const user = await service.manualVerifyEmail(id, admin);
    logger.info("admin_action", {
      type: "admin_action",
      action: "verify_user_email",
      targetId: id,
      adminId: admin.id,
    });
    return json(user);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}

// ── Stats ────────────────────────────────────────────────────────────

export async function handleDashboardStats(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const [stats, disk] = await Promise.all([
    service.dashboardStats(),
    service.diskUsage(),
  ]);
  return json({ ...stats, disk });
}

// ── Projects (admin-wide) ────────────────────────────────────────────

export async function handleListProjectsAdmin(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get("status");
  const status =
    statusParam && Object.values(ProjectStatus).includes(statusParam as ProjectStatus)
      ? (statusParam as ProjectStatus)
      : undefined;

  const result = await service.listProjects({
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 25,
    search: searchParams.get("search") || undefined,
    status,
    userId: searchParams.get("userId") || undefined,
  });
  return json(result);
}

// ── Time series / traffic ───────────────────────────────────────────

export async function handleTimeseries(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const days = Math.min(
    90,
    Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30)
  );
  const data = await service.timeseries(days);
  return json(data);
}

export async function handleTraffic(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 10;
  const days = Number(req.nextUrl.searchParams.get("days")) || 30;
  const data = await service.traffic({ limit, days });
  return json(data);
}

// ── Settings / maintenance / moderation ─────────────────────────────

export async function handleGetSettings(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const [rateLimits, maintenance] = await Promise.all([
    moderationService.getRateLimits(),
    moderationService.getMaintenance(),
  ]);
  return json({ rateLimits, maintenance });
}

export async function handleUpdateRateLimits(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const admin = adminFromHeaders(req);
  const body = await req.json().catch(() => ({}));
  try {
    const next = await moderationService.updateRateLimits(body ?? {}, admin);
    return json(next);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 400);
  }
}

export async function handleSetMaintenance(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const admin = adminFromHeaders(req);
  const body = await req.json().catch(() => ({}));
  const enabled = body?.enabled === true;
  const message = typeof body?.message === "string" ? body.message : null;
  try {
    await moderationService.setMaintenance(enabled, message, admin);
    return json({ ok: true, enabled, message });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 500);
  }
}

// Domain blacklist

export async function handleListBlacklist(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const entries = await moderationService.listBlacklist();
  return json({ entries });
}

export async function handleAddBlacklist(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const admin = adminFromHeaders(req);
  const body = await req.json().catch(() => ({}));
  try {
    const entry = await moderationService.addBlacklistEntry(
      body?.pattern ?? "",
      body?.reason ?? null,
      admin
    );
    return json(entry, 201);
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 400);
  }
}

export async function handleDeleteBlacklist(req: NextRequest, id: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const admin = adminFromHeaders(req);
  try {
    await moderationService.removeBlacklistEntry(id, admin);
    return json({ ok: true });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 400);
  }
}

// Themes

export async function handleListThemesAdmin(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const themes = await moderationService.listThemes();
  return json({ themes });
}

export async function handleToggleTheme(req: NextRequest, name: string) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;
  const admin = adminFromHeaders(req);
  const body = await req.json().catch(() => ({}));
  try {
    // Enable/disable is only touched when `enabled` is explicitly sent —
    // that way pricing edits don't accidentally re-enable a disabled theme.
    if (typeof body?.enabled === "boolean") {
      await moderationService.setThemeEnabled(
        name,
        body.enabled,
        typeof body?.reason === "string" ? body.reason : null,
        admin
      );
    }

    const pricingPatch: Record<string, unknown> = {};
    if (typeof body?.isPremium === "boolean") {
      pricingPatch.isPremium = body.isPremium;
    }
    if ("priceTry" in (body ?? {})) {
      pricingPatch.priceTry =
        body.priceTry === null ? null : Number(body.priceTry);
    }
    if ("priceUsd" in (body ?? {})) {
      pricingPatch.priceUsd =
        body.priceUsd === null ? null : Number(body.priceUsd);
    }
    if (Object.keys(pricingPatch).length > 0) {
      await moderationService.updateThemeSettings(name, pricingPatch, admin);
    }

    // Return the merged row so the client has the latest state.
    const themes = await moderationService.listThemes();
    const latest = themes.find((t) => t.name === name);
    return json(latest ?? { name });
  } catch (e) {
    return error(e instanceof Error ? e.message : "Failed", 400);
  }
}

// Logs viewer

export async function handleReadLogs(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const source = req.nextUrl.searchParams.get("source") as
    | "api"
    | "admin"
    | "cleanup"
    | "aggregate"
    | null;
  const lines = Number(req.nextUrl.searchParams.get("lines")) || 200;

  if (!source || !["api", "admin", "cleanup", "aggregate"].includes(source)) {
    return error("source must be api | admin | cleanup | aggregate", 400);
  }

  const admin = adminFromHeaders(req);
  const content = await moderationService.readLogs(source, lines);

  // Audit every log view for accountability
  const { writeAudit } = await import("@/src/lib/audit");
  await writeAudit({
    adminId: admin.id,
    adminEmail: admin.email,
    action: "view_logs",
    targetType: "system",
    targetId: source,
    metadata: { lines },
  });

  return new NextResponse(content, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ── Audit log ────────────────────────────────────────────────────────

export async function handleListAudit(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const result = await service.listAudit({
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 50,
    adminId: searchParams.get("adminId") || undefined,
    action: searchParams.get("action") || undefined,
    targetType: searchParams.get("targetType") || undefined,
    targetId: searchParams.get("targetId") || undefined,
  });
  return json(result);
}

export async function handleWriteAudit(req: NextRequest) {
  const guardRes = guard(req);
  if (guardRes) return guardRes;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid body", 400);

  const { adminId, adminEmail, action, targetType, targetId, metadata } = body;
  if (!adminId || !adminEmail || !action || !targetType || !targetId) {
    return error("Missing required fields", 400);
  }

  await service.writeAuditFromAdminBackend({
    adminId,
    adminEmail,
    action,
    targetType,
    targetId,
    metadata,
  });
  return json({ ok: true }, 201);
}
