import { handleGetMockData } from "@/src/modules/theme/theme.controller";

interface Params { params: Promise<{ name: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { name } = await params;
  return handleGetMockData(name);
}
