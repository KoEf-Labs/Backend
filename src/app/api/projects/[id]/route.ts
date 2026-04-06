import { NextRequest } from "next/server";
import { handleGet, handlePatch, handleDelete } from "@/src/modules/project/project.controller";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleGet(req, id);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handlePatch(req, id);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleDelete(req, id);
}
