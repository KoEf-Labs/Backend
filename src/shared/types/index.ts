/**
 * Shared types used across modules.
 */

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectContent {
  sections: Record<string, boolean>;
  navbar: Record<string, unknown>;
  hero?: Record<string, unknown>;
  about?: Record<string, unknown>;
  services?: Record<string, unknown>;
  references?: Record<string, unknown>;
  portfolio?: Record<string, unknown>;
  careers?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  footer: Record<string, unknown>;
}
