import { NextRequest, NextResponse } from "next/server";
import { DomainService, DomainError } from "@/src/modules/domain";
import { RenderService, RenderError } from "@/src/modules/render/render.service";
import { ProjectStatus } from "@prisma/client";
import { trackView } from "@/src/lib/site-views";
import { getClientIp } from "@/src/lib/rate-limit";
import { getMaintenanceState, maintenanceHtml } from "@/src/lib/maintenance";
import { getEffectiveAccess } from "@/src/lib/subscriptions";

// How many sections a Free-tier site may publish. Anything beyond is
// silently hidden from the rendered HTML so the public site stays
// within the tier the user is currently paying for (or not).
const FREE_SECTION_LIMIT = 3;

/**
 * Walks publishedContent and truncates the "sections" array (any level)
 * to FREE_SECTION_LIMIT. Themes that don't use a top-level sections
 * array are left untouched — this only affects sites that opt into the
 * shared schema, which is all of ours at the time of writing. The copy
 * is shallow for the root object and deep-ish for sections so we don't
 * mutate the Prisma result.
 */
function truncateForFreeTier(
  content: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...content };
  if (Array.isArray(out.sections) && out.sections.length > FREE_SECTION_LIMIT) {
    out.sections = (out.sections as unknown[]).slice(0, FREE_SECTION_LIMIT);
  }
  if (Array.isArray(out.pages) && out.pages.length > FREE_SECTION_LIMIT) {
    out.pages = (out.pages as unknown[]).slice(0, FREE_SECTION_LIMIT);
  }
  return out;
}

const domainService = new DomainService();
const renderService = new RenderService();

const BASE_DOMAIN = process.env.BASE_DOMAIN || "yourapp.com";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/site/live?host=mysite.yourapp.com
 *
 * Public site serving endpoint.
 * Resolves host → project → renders publishedContent.
 *
 * In production, nginx will proxy real domain requests here.
 * In dev, use ?host= query param to simulate domain resolution.
 */
export async function GET(req: NextRequest) {
  // Maintenance mode — render a friendly page instead of a real site
  const maintenance = await getMaintenanceState();
  if (maintenance.enabled) {
    return new NextResponse(maintenanceHtml(maintenance.message), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "60",
      },
    });
  }

  // Use ?host= param for dev, or real Host header in production
  const host =
    req.nextUrl.searchParams.get("host") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "";

  if (!host) {
    return error("No host provided", 400);
  }

  // Resolve host → project
  const project = await domainService.resolveHost(host, BASE_DOMAIN);

  if (!project) {
    return error("Site not found", 404);
  }

  // Only serve published sites
  if (project.status !== ProjectStatus.PUBLISHED || !project.publishedContent) {
    return error("This site is not published yet", 404);
  }

  // Custom domain must be verified
  if (project.customDomain && project.domainVerificationStatus !== "VERIFIED") {
    return error("Domain not verified", 403);
  }

  // Track view (non-blocking, Redis counter)
  trackView(project.id, getClientIp(req)).catch(() => {});

  // Enforce the owner's current tier. If their subscription expired
  // (even though the site is still PUBLISHED in the DB) we clip the
  // published content down to Free limits before handing it to the
  // renderer. Custom domains are forced off by the rendering layer as
  // well via nginx — this only affects what content reaches the page.
  let content = project.publishedContent as Record<string, unknown>;
  try {
    const access = await getEffectiveAccess(project.userId);
    if (access.tier === "FREE") {
      content = truncateForFreeTier(content);
    }
  } catch {
    // Fail open: serve whatever was published rather than 500'ing the
    // public site if the access lookup has a hiccup.
  }

  // Render
  try {
    const result = await renderService.renderTheme({
      theme: project.theme,
      content,
    });

    return new NextResponse(result.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        "X-Theme": project.theme,
        "X-Project-Id": project.id,
        "X-Rendered-At": result.renderedAt,
      },
    });
  } catch (e) {
    if (e instanceof RenderError) return error(e.message, e.status);
    return error("Render failed", 500);
  }
}
