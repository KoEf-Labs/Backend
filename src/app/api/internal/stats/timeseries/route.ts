import { NextRequest } from "next/server";
import { handleTimeseries } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleTimeseries(req);
}
