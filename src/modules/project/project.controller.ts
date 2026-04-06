import { NextRequest, NextResponse } from "next/server";
import { ProjectService, ServiceError } from "./project.service";
import { validateThemeName } from "@/src/shared/utils";
import { getUserId as getAuthUserId } from "@/src/lib/auth";

const service = new ProjectService();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getUserId(req: NextRequest): string | null {
  return getAuthUserId(req);
}

function sanitizeSubdomain(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return cleaned || undefined;
}

function sanitizeDomain(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase().slice(0, 253);
  if (cleaned && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(cleaned)) {
    return undefined;
  }
  return cleaned || undefined;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleGet(req: NextRequest, id?: string) {
  const userId = getUserId(req);
  if (!userId) return error("Missing x-user-id header", 401);

  try {
    if (id) {
      const project = await service.getByIdForUser(id, userId);
      return json(project);
    }
    const projects = await service.listByUser(userId);
    return json(projects);
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handlePost(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return error("Missing x-user-id header", 401);

  try {
    const body = await req.json();

    const theme = validateThemeName(body.theme);
    if (!theme) return error("Invalid or unknown theme", 400);

    const project = await service.create({
      userId,
      theme,
      contentJson: body.contentJson ?? {},
      subdomain: sanitizeSubdomain(body.subdomain),
      customDomain: sanitizeDomain(body.customDomain),
    });
    return json(project, 201);
  } catch (e: any) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    if (e?.status) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handlePatch(req: NextRequest, id: string) {
  const userId = getUserId(req);
  if (!userId) return error("Missing x-user-id header", 401);

  try {
    const body = await req.json();

    // If theme is being changed, validate it
    let theme: string | undefined;
    if (body.theme !== undefined) {
      const valid = validateThemeName(body.theme);
      if (!valid) return error("Invalid or unknown theme", 400);
      theme = valid;
    }

    const project = await service.update(id, userId, {
      contentJson: body.contentJson,
      theme,
      subdomain: sanitizeSubdomain(body.subdomain),
      customDomain: sanitizeDomain(body.customDomain),
    });
    return json(project);
  } catch (e: any) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    if (e?.status) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handleDelete(req: NextRequest, id: string) {
  const userId = getUserId(req);
  if (!userId) return error("Missing x-user-id header", 401);

  try {
    await service.delete(id, userId);
    return json({ deleted: true });
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
