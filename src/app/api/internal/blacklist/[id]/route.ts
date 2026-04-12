import { NextRequest } from "next/server";
import { handleDeleteBlacklist } from "@/src/modules/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleDeleteBlacklist(req, id);
}
