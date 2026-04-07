import { NextRequest, NextResponse } from "next/server";
import { ProjectService, ServiceError } from "@/src/modules/project/project.service";
import { RenderService, RenderError } from "@/src/modules/render/render.service";
import { getUserId } from "@/src/lib/auth";

const projectService = new ProjectService();
const renderService = new RenderService();

interface Params {
  params: Promise<{ projectId: string }>;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/site/preview/:projectId
 *
 * Two modes:
 * - Authenticated (JWT) or ?draft=true → owner preview, renders draftContent
 * - Public (no auth) → renders publishedContent only
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { projectId } = await params;
  const userId = getUserId(req);
  const isDraftPreview = req.nextUrl.searchParams.get("draft") === "true";

  // 1. Fetch project
  let project;
  try {
    if (userId) {
      project = await projectService.getByIdForUser(projectId, userId);
    } else {
      project = await projectService.getById(projectId);
      if (!project) {
        return error("Project not found", 404);
      }
    }
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Failed to fetch project", 500);
  }

  // 2. Determine which content to render
  let content: Record<string, unknown>;

  if (userId || isDraftPreview) {
    // Owner preview → show draftContent
    content = project.draftContent as Record<string, unknown>;
  } else {
    // Public view → only show publishedContent
    if (!project.publishedContent) {
      return error("This site is not published yet", 404);
    }
    content = project.publishedContent as Record<string, unknown>;
  }

  // 3. Validate project has a theme
  if (!project.theme) {
    return error("Project has no theme assigned", 400);
  }

  // 4. Render HTML
  try {
    const result = await renderService.renderTheme({
      theme: project.theme,
      content,
    });

    // Published public pages get browser cache, drafts don't
    const cacheControl =
      !userId && !isDraftPreview
        ? "public, max-age=300, stale-while-revalidate=60"
        : "no-cache, no-store";

    return new NextResponse(result.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": cacheControl,
        "X-Theme": project.theme,
        "X-Project-Id": project.id,
        "X-Rendered-At": result.renderedAt,
        "X-Status": project.status,
      },
    });
  } catch (e) {
    if (e instanceof RenderError) return error(e.message, e.status);
    return error("Render failed", 500);
  }
}
