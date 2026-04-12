import { NextRequest } from "next/server";
import { handleListUsers } from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleListUsers(req);
}
