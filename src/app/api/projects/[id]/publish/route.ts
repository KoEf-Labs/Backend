import { NextRequest, NextResponse } from "next/server";
import { handlePublish } from "@/src/modules/project/project.controller";
import { isRateLimited, getClientIp } from "@/src/lib/rate-limit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req);
  if (await isRateLimited(`publish:${ip}`)) {
    return NextResponse.json({ error: "Too many publish requests. Please try again later." }, { status: 429 });
  }

  const { id } = await params;
  return handlePublish(req, id);
}
