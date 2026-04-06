import { NextRequest, NextResponse } from "next/server";
import { ProjectService, ServiceError } from "@/src/modules/project/project.service";
import { RenderService, RenderError } from "@/src/modules/render/render.service";

const projectService = new ProjectService();
const renderService = new RenderService();

interface Params {
  params: Promise<{ projectId: string }>;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/preview/:projectId
 *
 * Public endpoint — no auth required.
 * Fetches project from DB, renders theme with contentJson, returns HTML.
 *
 * Optional: pass x-user-id header to verify ownership.
 * Without it, renders any project (useful for browser preview & WebView).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { projectId } = await params;
  const userId = req.headers.get("x-user-id");

  // 1. Fetch project
  let project;
  try {
    if (userId) {
      // If auth header provided, verify ownership
      project = await projectService.getByIdForUser(projectId, userId);
    } else {
      // Public preview — fetch without ownership check
      project = await projectService.getById(projectId);
      if (!project) {
        return error("Project not found", 404);
      }
    }
  } catch (e) {
    if (e instanceof ServiceError) return error(e.message, e.status);
    return error("Failed to fetch project", 500);
  }

  // 2. Validate project has a theme
  if (!project.theme) {
    return error("Project has no theme assigned", 400);
  }

  // 3. Render HTML
  try {
    const result = await renderService.renderTheme({
      theme: project.theme,
      content: project.contentJson as Record<string, unknown>,
    });

    return new NextResponse(result.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
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
