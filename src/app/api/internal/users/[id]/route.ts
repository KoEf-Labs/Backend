import { NextRequest } from "next/server";
import { handleGetUser } from "@/src/modules/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleGetUser(req, id);
}
