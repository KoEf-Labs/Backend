import { NextRequest } from "next/server";
import {
  handleInternalGet,
  handleInternalAdminDelete,
} from "@/src/modules/project/project.controller";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleInternalGet(req, id);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleInternalAdminDelete(req, id);
}
