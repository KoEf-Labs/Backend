import { handlePreview } from "@/src/modules/render/render.controller";

interface Params { params: Promise<{ theme: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { theme } = await params;
  return handlePreview(theme);
}
