import { handleAdminApprove } from "@/src/modules/project/project.controller";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  return handleAdminApprove(id);
}
