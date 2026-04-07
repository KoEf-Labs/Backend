import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

interface Params {
  params: Promise<{ path: string[] }>;
}

/**
 * GET /api/uploads/u-abc123/img-123.webp
 * Serves uploaded files from local disk.
 * In production, nginx should serve these directly.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { path: segments } = await params;
  const filePath = path.join(UPLOADS_DIR, ...segments);

  // Prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(resolved);
  const ext = path.extname(resolved).toLowerCase();

  const mimeMap: Record<string, string> = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeMap[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
