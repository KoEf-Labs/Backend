import { NextRequest } from "next/server";
import { handleListAudit, handleWriteAudit } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleListAudit(req);
}

export async function POST(req: NextRequest) {
  return handleWriteAudit(req);
}
