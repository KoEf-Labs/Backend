import { NextRequest } from "next/server";
import { handleToggleTheme } from "@/src/modules/admin";

interface Params {
  params: Promise<{ name: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { name } = await params;
  return handleToggleTheme(req, name);
}
