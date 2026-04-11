import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/src/lib/auth";
import { UploadService, UploadError } from "@/src/modules/upload";
import { isRenderRateLimited, getClientIp } from "@/src/lib/rate-limit";

const uploadService = new UploadService();

export const runtime = "nodejs";

/**
 * POST /api/upload
 * Multipart form data with "file" field.
 * Returns { url, size, width, height }
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (await isRenderRateLimited(`upload:${ip}`)) {
    return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.processUpload(
      userId,
      buffer,
      file.name,
      file.type
    );

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
