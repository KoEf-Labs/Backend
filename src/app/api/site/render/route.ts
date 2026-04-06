import { NextRequest } from "next/server";
import { handleRender } from "@/src/modules/render/render.controller";

export async function POST(req: NextRequest) {
  return handleRender(req);
}
