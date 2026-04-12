import { NextRequest } from "next/server";
import { handleListProjectsAdmin } from "@/src/modules/admin";

/**
 * Admin-wide projects list with filtering.
 * Unlike /api/internal/projects/pending which only returns PENDING rows,
 * this endpoint supports ?status, ?search, ?userId pagination for the
 * full admin-panel "All projects" view.
 */
export async function GET(req: NextRequest) {
  return handleListProjectsAdmin(req);
}
