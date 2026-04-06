import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware.
 * TODO: Efekan — Add:
 * - JWT auth check for protected routes
 * - Rate limiting
 * - CORS headers
 */
export function middleware(request: NextRequest) {
  // Add CORS headers for Flutter app
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-user-id, Authorization");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
