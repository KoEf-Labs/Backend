import { handleListThemes } from "@/src/modules/theme/theme.controller";

export async function GET() {
  return handleListThemes();
}
