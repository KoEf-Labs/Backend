import { handleAdminList } from "@/src/modules/project/project.controller";

export async function GET() {
  return handleAdminList();
}
