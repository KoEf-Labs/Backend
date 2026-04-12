import { NextRequest } from "next/server";
import { handleInternalReject } from "@/src/modules/project/project.controller";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleInternalReject(req, id);
}
