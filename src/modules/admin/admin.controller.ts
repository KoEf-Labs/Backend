import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "./admin.service";
import { requireServiceToken, AuthError } from "@/src/lib/auth";
import { ProjectStatus } from "@prisma/client";
import { logger } from "@/src/lib/logger";

const service = new AdminService();

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
