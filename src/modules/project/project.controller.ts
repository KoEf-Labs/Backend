import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ProjectService, ServiceError } from "./project.service";
import { validateThemeName } from "@/src/shared/utils";
import { MAX_CONTENT_SIZE } from "@/src/shared/constants";
import { getUserId as getAuthUserId, requireAdmin, AuthError } from "@/src/lib/auth";
import { DomainService } from "@/src/modules/domain";
import { sendDeleteConfirmationEmail } from "@/src/lib/email";

const service = new ProjectService();
const domainService = new DomainService();

// In-memory store for delete confirmation codes (swap with Redis in production)
const deleteConfirmations = new Map<string, { code: string; userId: string; expiresAt: number }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function requireUserId(req: NextRequest): string {
  const userId = getAuthUserId(req);
  if (!userId) throw new AuthError("Authentication required", 401);
  return userId;
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
    rejectReason: project.rejectReason ?? null,
    domainVerificationStatus: project.domainVerificationStatus ?? null,
    domainVerifiedAt: project.domainVerifiedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function handleGet(req: NextRequest, id?: string) {
  const userId = requireUserId(req);

  try {
    if (id) {
      const project = await service.getByIdForUser(id, userId);
      return json(toApiResponse(project));
    }

    // Pagination params
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);

    const result = await service.listByUser(userId, { page, limit });
    return json({
      projects: result.projects.map(toApiResponse),
      pagination: result.pagination,
    });
  } catch (e) {
    if (e instanceof AuthError) return error(e.message, e.status);
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

export async function handlePost(req: NextRequest) {
  const userId = requireUserId(req);

  try {
    const body = await req.json();

    const theme = validateThemeName(body.theme);
    if (!theme) return error("Invalid or unknown theme", 400);

    // Content size check
    if (body.contentJson) {
      const contentSize = JSON.stringify(body.contentJson).length;
      if (contentSize > MAX_CONTENT_SIZE) {
        return error(`Content too large (${(contentSize / 1024 / 1024).toFixed(1)}MB). Max: 2MB`, 400);
      }
    }

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
  const userId = requireUserId(req);

  try {
    const body = await req.json();

    // Content size check
    if (body.contentJson) {
      const contentSize = JSON.stringify(body.contentJson).length;
      if (contentSize > MAX_CONTENT_SIZE) {
        return error(`Content too large (${(contentSize / 1024 / 1024).toFixed(1)}MB). Max: 2MB`, 400);
      }
    }

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

/**
 * POST handler for requesting delete confirmation.
 * Generates a 6-digit code, sends via email, stores in memory.
 */
export async function handleRequestDelete(req: NextRequest, id: string) {
  try {
    const userId = requireUserId(req);
    const project = await service.getByIdForUser(id, userId);

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    deleteConfirmations.set(id, {
      code,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Get user email from project
    const { prisma } = await import("@/src/lib/db");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

    if (user) {
      const name = (project.draftContent as any)?.navbar?.logo || "your project";
      await sendDeleteConfirmationEmail(user.email, code, name);
    }

    return json({ message: "Confirmation code sent to your email" });
  } catch (e) {
    if (e instanceof AuthError) return error(e.message, e.status);
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

/**
 * DELETE handler — requires confirmation code from email.
 */
export async function handleDelete(req: NextRequest, id: string) {
  try {
    const userId = requireUserId(req);

    // Check confirmation code
    const body = await req.json().catch(() => ({}));
    const confirmation = deleteConfirmations.get(id);

    if (!confirmation || confirmation.userId !== userId) {
      return error("Please request a deletion code first", 400);
    }

    if (Date.now() > confirmation.expiresAt) {
      deleteConfirmations.delete(id);
      return error("Confirmation code expired. Request a new one.", 400);
    }

    if (body.code !== confirmation.code) {
      return error("Invalid confirmation code", 400);
    }

    deleteConfirmations.delete(id);
    await service.delete(id, userId);
    return json({ deleted: true });
  } catch (e) {
    if (e instanceof AuthError) return error(e.message, e.status);
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// Publish — user submits for review
// ---------------------------------------------------------------------------

export async function handlePublish(req: NextRequest, id: string) {
  const userId = requireUserId(req);

  try {
    const project = await service.submitForReview(id, userId);
    return json(toApiResponse(project));
  } catch (e) {
    if (e instanceof AuthError) return error(e.message, e.status);
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
    if (e instanceof AuthError) return error(e.message, e.status);
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
    if (e instanceof AuthError) return error(e.message, e.status);
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
    if (e instanceof AuthError) return error(e.message, e.status);
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
