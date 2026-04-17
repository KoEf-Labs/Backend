import { NextRequest } from "next/server";
import { handleListThemes } from "@/src/modules/theme/theme.controller";

export async function GET(req: NextRequest) {
  return handleListThemes(req);
}
