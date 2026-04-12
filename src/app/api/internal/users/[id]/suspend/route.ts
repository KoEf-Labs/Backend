import { NextRequest } from "next/server";
import { handleSuspendUser } from "@/src/modules/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleSuspendUser(req, id);
}
