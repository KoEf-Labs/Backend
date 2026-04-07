import { NextRequest, NextResponse } from "next/server";
import { ProjectService, ServiceError } from "./project.service";
import fs from "fs";
import path from "path";

const service = new ProjectService();
const THEMES_DIR = path.join(process.cwd(), "themes");

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
  return req.headers.get("x-user-id");
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

/**
 * Validate theme name format AND existence.
 */
function validateThemeName(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50);
  if (!cleaned) return null;
  const themeDir = path.join(THEMES_DIR, cleaned);
  if (!fs.existsSync(themeDir) || !fs.statSync(themeDir).isDirectory()) {
    return null;
  }
  return cleaned;
}

/**
 * Map project DB record to API response.
 * Mobil taraf "contentJson" bekliyor → draftContent'i contentJson olarak döndür.
 */
function toApiResponse(project: any) {
  const { draftContent, publishedContent, ...rest } = project;
  return {
    ...rest,
    contentJson: draftContent,
    publishedContent: publishedContent ?? null,
  };
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
      return json(toApiResponse(project));
    }
    const projects = await service.listByUser(userId);
    return json(projects.map(toApiResponse));
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
    return json(toApiResponse(project), 201);
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
    return json(toApiResponse(project));
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

// ---------------------------------------------------------------------------
// Publish — user submits for review
// ---------------------------------------------------------------------------

export async function handlePublish(req: NextRequest, id: string) {
  const userId = getUserId(req);
  if (!userId) return error("Missing x-user-id header", 401);

  try {
    const project = await service.submitForReview(id, userId);
    return json(toApiResponse(project));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// Admin — approve / reject / list pending
// ---------------------------------------------------------------------------

export async function handleAdminList() {
  try {
    const projects = await service.listPending();
    return json(projects.map(toApiResponse));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handleAdminApprove(id: string) {
  try {
    const project = await service.approve(id);
    return json(toApiResponse(project));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handleAdminReject(req: NextRequest, id: string) {
  try {
    const body = await req.json().catch(() => ({}));
    const project = await service.reject(id, body.reason);
    return json(toApiResponse(project));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
