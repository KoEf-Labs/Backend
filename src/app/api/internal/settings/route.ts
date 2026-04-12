import { NextRequest } from "next/server";
import {
  handleGetSettings,
  handleUpdateRateLimits,
} from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleGetSettings(req);
}

export async function PATCH(req: NextRequest) {
  return handleUpdateRateLimits(req);
}
