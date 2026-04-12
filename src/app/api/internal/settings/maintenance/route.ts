import { NextRequest } from "next/server";
import { handleSetMaintenance } from "@/src/modules/admin";

export async function POST(req: NextRequest) {
  return handleSetMaintenance(req);
}
