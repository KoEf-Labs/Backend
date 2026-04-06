import { handleGetParsedSchema } from "@/src/modules/theme/schema.controller";

interface Params { params: Promise<{ name: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { name } = await params;
  return handleGetParsedSchema(name);
}
