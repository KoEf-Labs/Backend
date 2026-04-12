import { NextRequest, NextResponse } from "next/server";
import { DomainService, DomainError } from "@/src/modules/domain";
import { RenderService, RenderError } from "@/src/modules/render/render.service";
import { ProjectStatus } from "@prisma/client";
import { trackView } from "@/src/lib/site-views";
import { getClientIp } from "@/src/lib/rate-limit";

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

  // Render
  try {
    const result = await renderService.renderTheme({
      theme: project.theme,
      content: project.publishedContent as Record<string, unknown>,
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
