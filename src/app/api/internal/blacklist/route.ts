import { NextRequest } from "next/server";
import {
  handleListBlacklist,
  handleAddBlacklist,
} from "@/src/modules/admin";

export async function GET(req: NextRequest) {
  return handleListBlacklist(req);
}

export async function POST(req: NextRequest) {
  return handleAddBlacklist(req);
}
