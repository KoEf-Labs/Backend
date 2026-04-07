import { NextRequest } from "next/server";
import { handleAdminList } from "@/src/modules/project/project.controller";

export async function GET(req: NextRequest) {
  return handleAdminList(req);
}
