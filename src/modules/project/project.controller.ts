import { NextRequest, NextResponse } from "next/server";
import { ProjectService, ServiceError } from "./project.service";
import { validateThemeName } from "@/src/shared/utils";
import { getUserId as getAuthUserId, requireAdmin } from "@/src/lib/auth";
import { DomainService } from "@/src/modules/domain";

const service = new ProjectService();
const domainService = new DomainService();

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
    domainVerificationStatus: project.domainVerificationStatus ?? null,
    domainVerifiedAt: project.domainVerifiedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleGet(req: NextRequest, id?: string) {
  const userId = getUserId(req);
  if (!userId) return error("Authentication required", 401);

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
  if (!userId) return error("Authentication required", 401);

  try {
    const body = await req.json();

    const theme = validateThemeName(body.theme);
    if (!theme) return error("Invalid or unknown theme", 400);

    // Validate subdomain
    const subdomain = sanitizeSubdomain(body.subdomain);
    if (subdomain) {
      const validation = domainService.validateSubdomain(subdomain);
      if (!validation.valid) return error(validation.error!, 400);
      const available = await domainService.isSubdomainAvailable(subdomain);
      if (!available) return error("This subdomain is already taken", 409);
    }

    // Validate custom domain
    const customDomain = sanitizeDomain(body.customDomain);
    if (customDomain) {
      const validation = domainService.validateCustomDomain(customDomain);
      if (!validation.valid) return error(validation.error!, 400);
      const available = await domainService.isCustomDomainAvailable(customDomain);
      if (!available) return error("This domain is already in use", 409);
    }

    const project = await service.create({
      userId,
      theme,
      contentJson: body.contentJson ?? {},
      subdomain,
      customDomain,
    });
    return json(toApiResponse(project), 201);
  } catch (e: any) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    if (e?.code === "P2002") return error("This domain is already taken", 409);
    if (e?.status) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handlePatch(req: NextRequest, id: string) {
  const userId = getUserId(req);
  if (!userId) return error("Authentication required", 401);

  try {
    const body = await req.json();

    let theme: string | undefined;
    if (body.theme !== undefined) {
      const valid = validateThemeName(body.theme);
      if (!valid) return error("Invalid or unknown theme", 400);
      theme = valid;
    }

    // Validate subdomain if changing
    const subdomain = sanitizeSubdomain(body.subdomain);
    if (subdomain) {
      const validation = domainService.validateSubdomain(subdomain);
      if (!validation.valid) return error(validation.error!, 400);
    }

    // Validate custom domain if changing
    const customDomain = sanitizeDomain(body.customDomain);
    if (customDomain) {
      const validation = domainService.validateCustomDomain(customDomain);
      if (!validation.valid) return error(validation.error!, 400);
    }

    const project = await service.update(id, userId, {
      contentJson: body.contentJson,
      theme,
      subdomain,
      customDomain,
    });
    return json(toApiResponse(project));
  } catch (e: any) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    if (e?.code === "P2002") return error("This domain is already taken", 409);
    if (e?.status) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handleDelete(req: NextRequest, id: string) {
  const userId = getUserId(req);
  if (!userId) return error("Authentication required", 401);

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
  if (!userId) return error("Authentication required", 401);

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

export async function handleAdminList(req: NextRequest) {
  try {
    requireAdmin(req);
  } catch (e: any) {
    return error(e.message, e.status ?? 403);
  }

  try {
    const projects = await service.listPending();
    return json(projects.map(toApiResponse));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handleAdminApprove(req: NextRequest, id: string) {
  try {
    requireAdmin(req);
  } catch (e: any) {
    return error(e.message, e.status ?? 403);
  }

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
    requireAdmin(req);
  } catch (e: any) {
    return error(e.message, e.status ?? 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const project = await service.reject(id, body.reason);
    return json(toApiResponse(project));
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
