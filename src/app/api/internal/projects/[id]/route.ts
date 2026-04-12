import { NextRequest } from "next/server";
import { handleInternalGet } from "@/src/modules/project/project.controller";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleInternalGet(req, id);
}
