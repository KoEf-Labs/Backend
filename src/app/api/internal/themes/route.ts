import { NextRequest } from "next/server";
import { handleListThemesAdmin } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleListThemesAdmin(req);
}
