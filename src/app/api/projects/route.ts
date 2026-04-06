import { NextRequest } from "next/server";
import { handleGet, handlePost } from "@/src/modules/project/project.controller";

export async function GET(req: NextRequest) {
  return handleGet(req);
}

export async function POST(req: NextRequest) {
  return handlePost(req);
}
