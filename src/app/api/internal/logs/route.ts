import { NextRequest } from "next/server";
import { handleReadLogs } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleReadLogs(req);
}
