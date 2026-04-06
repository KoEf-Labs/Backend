import { NextRequest, NextResponse } from "next/server";
import { RenderService, RenderError } from "./render.service";

const service = new RenderService();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function html(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// POST /api/render → render theme with provided content JSON
// ---------------------------------------------------------------------------

export async function handleRender(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.theme) return error("Missing 'theme' field", 400);
    if (!body.content) return error("Missing 'content' field", 400);

    const format = req.nextUrl.searchParams.get("format");

    const result = await service.renderTheme(
      { theme: body.theme, content: body.content },
      { title: body.title, description: body.description }
    );

    // ?format=json → return metadata + html as JSON
    if (format === "json") {
      return json(result);
    }

    // Default → return raw HTML
    return html(result.html);
  } catch (e) {
    if (e instanceof RenderError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// GET /api/render/preview/:theme → render with mockData
// ---------------------------------------------------------------------------

export async function handlePreview(theme: string) {
  try {
    const result = await service.renderPreview(theme);
    return html(result.html);
  } catch (e) {
    if (e instanceof RenderError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
