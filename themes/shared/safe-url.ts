/**
 * Sanitize URLs for use in href/src attributes.
 * Blocks dangerous protocols (javascript:, data:, vbscript:).
 * Used by all theme layouts.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function safeUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return "#";
    return trimmed;
  } catch {
    if (/^[a-z]+:/i.test(trimmed)) return "#";
    return trimmed;
  }
}

export function safeEmbedUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "";
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    return trimmed;
  } catch {
    return "";
  }
}
