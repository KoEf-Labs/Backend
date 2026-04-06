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
 * GET /api/preview/:projectId
 *
 * Requires authentication. Fetches project, verifies ownership,
 * renders theme with contentJson, returns HTML.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { projectId } = await params;
  const userId = getUserId(req);

  if (!userId) {
    return error("Authentication required", 401);
  }

  // 1. Fetch project with ownership check
  let project;
  try {
    project = await projectService.getByIdForUser(projectId, userId);
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
