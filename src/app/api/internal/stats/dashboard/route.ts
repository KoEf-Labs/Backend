import { NextRequest } from "next/server";
import { handleDashboardStats } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleDashboardStats(req);
}
