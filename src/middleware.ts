import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Allowed origins — add production domain when deploying
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001").split(",")
);

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/health",
  "/api/docs",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/site/render",
  "/api/site/themes",
  "/api/site/preview",
  "/api/site/validate",
  "/api/site/live",
  "/api/domain/check",
  "/api/uploads",
  // Internal service-to-service (AdminBackend → Backend) — auth handled per-route via x-service-token
  "/api/internal",
];

// Trusted proxy header — only trust X-Forwarded-For behind a reverse proxy
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  // In development, allow localhost with any port
  if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
    return origin;
  }
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function addSecurityHeaders(response: NextResponse, pathname: string): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // CSP for rendered site pages (preview, live)
  if (pathname.startsWith("/api/site/preview") || pathname.startsWith("/api/site/live")) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' https://cdn.tailwindcss.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' https: data:",
        "font-src 'self' https:",
        "frame-src https://www.google.com https://maps.google.com",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ")
    );
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
}

function addCorsHeaders(response: NextResponse, origin: string | null): void {
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = getAllowedOrigin(request);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    return response;
  }

  const response = NextResponse.next();
  addCorsHeaders(response, origin);
  addSecurityHeaders(response, pathname);

  // Skip auth check for public routes
  if (isPublicRoute(pathname)) {
    return response;
  }

  // Check for Bearer token on protected routes
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Full JWT verification happens in route handlers via requireAuth()
  // Middleware only checks presence of the token for fast rejection

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
