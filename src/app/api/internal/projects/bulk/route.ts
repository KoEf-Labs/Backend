import { NextRequest } from "next/server";
import { handleInternalBulk } from "@/src/modules/project/project.controller";

export async function POST(req: NextRequest) {
  return handleInternalBulk(req);
}
