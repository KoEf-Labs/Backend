import { NextRequest } from "next/server";
import { handleInternalListPending } from "@/src/modules/project/project.controller";

export async function GET(req: NextRequest) {
  return handleInternalListPending(req);
}
