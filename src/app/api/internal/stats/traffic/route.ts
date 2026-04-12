import { NextRequest } from "next/server";
import { handleTraffic } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleTraffic(req);
}
