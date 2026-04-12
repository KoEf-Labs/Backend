/**
 * OpenAPI 3.1 specification for the public Backend API.
 *
 * Hand-maintained; update when adding/changing endpoints.
 * Rendered via /api/docs (Swagger UI) and /api/docs/json (raw spec).
 *
 * Internal routes (/api/internal/*) are intentionally omitted — those
 * are AdminBackend-only service-to-service calls and should not be
 * discoverable by end users.
 */

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Website Builder API",
    version: "1.0.0",
    description:
      "Public REST API powering the mobile app and published sites. Auth is JWT (RS256) — access tokens in `Authorization: Bearer`, refresh tokens in HTTP-only cookie.",
  },
  servers: [
    {
      url: "https://api.bilancotakip.com",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Local dev",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
        required: ["error"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          phone: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          emailVerified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          theme: { type: "string" },
          status: {
            type: "string",
            enum: ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"],
          },
          subdomain: { type: "string", nullable: true },
          customDomain: { type: "string", nullable: true },
          contentJson: { type: "object", additionalProperties: true },
          publishedContent: {
            type: "object",
            additionalProperties: true,
            nullable: true,
          },
          rejectReason: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PaginatedProjects: {
        type: "object",
        properties: {
          projects: {
            type: "array",
            items: { $ref: "#/components/schemas/Project" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        summary: "Liveness probe",
        description:
          "Reports database and Redis connectivity. Returns 200 when healthy or degraded (db up, redis down), 503 when the database is unreachable.",
        tags: ["System"],
        responses: {
          200: {
            description: "Service is healthy or degraded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      enum: ["ok", "degraded", "down"],
                    },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "integer" },
                    checks: {
                      type: "object",
                      properties: {
                        database: {
                          type: "object",
                          properties: {
                            status: { type: "string" },
                            latencyMs: { type: "integer" },
                          },
                        },
                        redis: {
                          type: "object",
                          properties: {
                            status: { type: "string" },
                            latencyMs: { type: "integer" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          503: { description: "Database unreachable" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: {
                    type: "string",
                    minLength: 8,
                    description: "8–128 chars, mixed case + digit/symbol",
                  },
                  name: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Validation error" },
          409: { description: "Email already registered" },
          429: { description: "Rate limited" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Sign in with email + password",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Logged in",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          401: { description: "Invalid credentials" },
          429: { description: "Rate limited" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        summary: "Rotate refresh token",
        tags: ["Auth"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "New access + refresh token pair" },
          401: { description: "Invalid or reused refresh token" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Revoke current refresh token",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Current user profile",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update name / phone / avatar",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  avatar: {
                    type: "string",
                    description:
                      "avatar_1..avatar_10, uploaded URL, or null to clear",
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Updated profile" } },
      },
    },
    "/api/auth/verify-email": {
      post: {
        summary: "Submit email verification code",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: { code: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Email verified" },
          400: { description: "Invalid or expired code" },
        },
      },
    },
    "/api/auth/resend-verification": {
      post: {
        summary: "Resend email verification code",
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Code resent" } },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        summary: "Request a password reset link",
        tags: ["Auth"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Always 200 to prevent account enumeration",
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        summary: "Complete password reset",
        tags: ["Auth"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password updated" },
          400: { description: "Invalid/expired token" },
        },
      },
    },
    "/api/projects": {
      get: {
        summary: "List current user's projects",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: "Paginated list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedProjects" },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a new project",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["theme"],
                properties: {
                  theme: { type: "string" },
                  contentJson: { type: "object" },
                  subdomain: { type: "string" },
                  customDomain: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        summary: "Get a project by id (owner only)",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Project",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Project" },
              },
            },
          },
          404: { description: "Not found" },
        },
      },
      patch: {
        summary: "Update project content/theme/domain",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        summary: "Soft-delete a project (requires delete confirmation code)",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: { code: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Deleted" },
          403: { description: "Invalid code" },
        },
      },
    },
    "/api/projects/{id}/publish": {
      post: {
        summary: "Submit project for admin review (DRAFT → PENDING)",
        description:
          "Requires the user's email to be verified. Fails with 403 otherwise.",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Submitted" },
          400: { description: "Already pending" },
          403: { description: "Email not verified" },
        },
      },
    },
    "/api/projects/{id}/request-delete": {
      post: {
        summary: "Email a 6-digit delete confirmation code",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Code sent" } },
      },
    },
    "/api/site/themes": {
      get: {
        summary: "List available themes",
        tags: ["Site"],
        responses: { 200: { description: "Themes" } },
      },
    },
    "/api/site/themes/{name}/schema": {
      get: {
        summary: "Get the editable schema for a theme",
        tags: ["Site"],
        parameters: [
          { name: "name", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Schema JSON" } },
      },
    },
    "/api/site/themes/{name}/mock": {
      get: {
        summary: "Get mock content used by previews",
        tags: ["Site"],
        parameters: [
          { name: "name", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Mock data" } },
      },
    },
    "/api/site/themes/{name}/preview": {
      get: {
        summary: "Render a theme preview with its mock data",
        tags: ["Site"],
        parameters: [
          { name: "name", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "HTML", content: { "text/html": {} } } },
      },
    },
    "/api/site/preview/{projectId}": {
      get: {
        summary: "Render a project preview",
        description:
          "Public: only PUBLISHED projects. Owner JWT or internal service token: draft content. Anyone else → 404.",
        tags: ["Site"],
        parameters: [
          {
            name: "projectId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "token",
            in: "query",
            schema: { type: "string" },
            description:
              "Optional: WebView fallback when Authorization header cannot be set.",
          },
        ],
        responses: {
          200: { description: "Rendered HTML" },
          404: { description: "Not found / not published" },
        },
      },
    },
    "/api/site/live": {
      get: {
        summary: "Host-based published-site dispatch",
        description:
          "Looks up the project matching the `host` query parameter and returns its static HTML. Used by the Nginx wildcard subdomain handler.",
        tags: ["Site"],
        parameters: [
          {
            name: "host",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Site HTML" },
          404: { description: "No site for this host" },
        },
      },
    },
    "/api/domain/check": {
      get: {
        summary: "Check subdomain or custom-domain availability",
        tags: ["Domain"],
        parameters: [
          {
            name: "subdomain",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "customDomain",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Availability",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean" },
                    available: { type: "boolean" },
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload": {
      post: {
        summary: "Upload an image (max 5MB, jpg/png/webp/gif/heic)",
        tags: ["Upload"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Uploaded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string" } },
                },
              },
            },
          },
          400: { description: "Invalid file" },
          413: { description: "File too large" },
          429: { description: "Rate limited" },
        },
      },
    },
  },
} as const;
