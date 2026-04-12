import { NextRequest } from "next/server";
import { handleManualVerifyEmail } from "@/src/modules/admin";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return handleManualVerifyEmail(req, id);
}
