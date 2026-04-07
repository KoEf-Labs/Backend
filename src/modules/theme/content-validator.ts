import sanitizeHtml from "sanitize-html";
import { SchemaService, SchemaField, SchemaGroup } from "./schema.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentValidationResult {
  valid: boolean;
  errors: ContentValidationError[];
}

export interface ContentValidationError {
  path: string;
  message: string;
  type: "missing" | "wrong_type" | "too_long" | "invalid_option" | "max_items" | "xss" | "invalid_url";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 500;
const MAX_TEXTAREA_LENGTH = 5000;
const MAX_URL_LENGTH = 2000;

// sanitize-html config — strip ALL HTML tags, no exceptions
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

// Dangerous URL protocols — anything not in this list is blocked
const SAFE_URL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

// Additional XSS patterns that encoding tricks might bypass
const XSS_PATTERNS = [
  /<script/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<form/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
];

// ---------------------------------------------------------------------------
// URL Sanitization (used by themes via import)
// ---------------------------------------------------------------------------

/**
 * Sanitize a URL — block dangerous protocols.
 * Returns "#" if URL is unsafe.
 */
export function safeUrl(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) return "#";

  const trimmed = url.trim();

  // Allow relative URLs (start with / or #)
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;

  // Parse and check protocol
  try {
    const parsed = new URL(trimmed);
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) return "#";
    return trimmed;
  } catch {
    // Not a valid absolute URL — could be a relative path or anchor
    // Block anything that looks like a protocol
    if (/^[a-z]+:/i.test(trimmed)) return "#";
    return trimmed;
  }
}

/**
 * Sanitize a URL specifically for iframe src — only allow https.
 */
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ContentValidator {
  private schemaService: SchemaService;

  constructor() {
    this.schemaService = new SchemaService();
  }

  /**
   * Validate content_json against a theme's schema.
   * Returns errors array — empty means valid.
   */
  validateContent(
    themeName: string,
    content: Record<string, unknown>
  ): ContentValidationResult {
    const schema = this.schemaService.getSchema(themeName);
    const errors: ContentValidationError[] = [];

    for (const [groupKey, group] of Object.entries(schema.groups)) {
      if (groupKey === "sections") {
        this.validateSections(content["sections"], schema.sections, errors);
        continue;
      }

      const groupContent = content[groupKey];
      if (groupContent === undefined || groupContent === null) continue;

      if (typeof groupContent !== "object" || Array.isArray(groupContent)) {
        errors.push({
          path: groupKey,
          message: `Expected object for "${groupKey}", got ${typeof groupContent}`,
          type: "wrong_type",
        });
        continue;
      }

      this.validateGroup(
        groupKey,
        group,
        groupContent as Record<string, unknown>,
        errors
      );
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Sanitize content — strip ALL HTML tags, block dangerous URLs.
   * Returns a cleaned copy.
   */
  sanitizeContent(
    themeName: string,
    content: Record<string, unknown>
  ): Record<string, unknown> {
    const schema = this.schemaService.getSchema(themeName);
    const cleaned = JSON.parse(JSON.stringify(content)); // deep copy

    for (const [groupKey, group] of Object.entries(schema.groups)) {
      if (groupKey === "sections") continue;
      if (!cleaned[groupKey] || typeof cleaned[groupKey] !== "object") continue;

      this.sanitizeGroup(group, cleaned[groupKey] as Record<string, unknown>);
    }

    return cleaned;
  }

  // ─── Private ────────────────────────────────────────────────────────

  private validateSections(
    sections: unknown,
    validSections: string[],
    errors: ContentValidationError[]
  ): void {
    if (!sections || typeof sections !== "object") return;

    const sec = sections as Record<string, unknown>;
    for (const [key, value] of Object.entries(sec)) {
      if (!validSections.includes(key)) {
        errors.push({
          path: `sections.${key}`,
          message: `Unknown section "${key}"`,
          type: "invalid_option",
        });
      }
      if (typeof value !== "boolean") {
        errors.push({
          path: `sections.${key}`,
          message: `Section toggle must be boolean, got ${typeof value}`,
          type: "wrong_type",
        });
      }
    }
  }

  private validateGroup(
    groupPath: string,
    group: SchemaGroup,
    content: Record<string, unknown>,
    errors: ContentValidationError[]
  ): void {
    for (const [fieldKey, fieldDef] of Object.entries(group.fields)) {
      const path = `${groupPath}.${fieldKey}`;
      const value = content[fieldKey];

      this.validateField(path, fieldDef, value, errors);
    }
  }

  private validateField(
    path: string,
    field: SchemaField,
    value: unknown,
    errors: ContentValidationError[]
  ): void {
    if (value === undefined || value === null) return;

    switch (field.type) {
      case "text":
        if (typeof value !== "string") {
          errors.push({ path, message: `Expected string, got ${typeof value}`, type: "wrong_type" });
          return;
        }
        if (value.length > MAX_TEXT_LENGTH) {
          errors.push({ path, message: `Text too long (${value.length}/${MAX_TEXT_LENGTH})`, type: "too_long" });
        }
        this.checkXSS(path, value, errors);
        this.checkUrl(path, value, errors);
        break;

      case "textarea":
        if (typeof value !== "string") {
          errors.push({ path, message: `Expected string, got ${typeof value}`, type: "wrong_type" });
          return;
        }
        if (value.length > MAX_TEXTAREA_LENGTH) {
          errors.push({ path, message: `Text too long (${value.length}/${MAX_TEXTAREA_LENGTH})`, type: "too_long" });
        }
        this.checkXSS(path, value, errors);
        break;

      case "image":
        if (typeof value !== "string") {
          errors.push({ path, message: `Expected URL string, got ${typeof value}`, type: "wrong_type" });
          return;
        }
        if (value.length > MAX_URL_LENGTH) {
          errors.push({ path, message: `URL too long (${value.length}/${MAX_URL_LENGTH})`, type: "too_long" });
        }
        if (value && safeUrl(value) === "#") {
          errors.push({ path, message: `Invalid or unsafe URL`, type: "invalid_url" });
        }
        break;

      case "toggle":
        if (typeof value !== "boolean") {
          errors.push({ path, message: `Expected boolean, got ${typeof value}`, type: "wrong_type" });
        }
        break;

      case "select":
        if (typeof value !== "string") {
          errors.push({ path, message: `Expected string, got ${typeof value}`, type: "wrong_type" });
          return;
        }
        if (field.options && !field.options.includes(value)) {
          errors.push({ path, message: `Invalid option "${value}". Valid: ${field.options.join(", ")}`, type: "invalid_option" });
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          errors.push({ path, message: `Expected array, got ${typeof value}`, type: "wrong_type" });
          return;
        }
        if (field.maxItems && value.length > field.maxItems) {
          errors.push({ path, message: `Too many items (${value.length}/${field.maxItems})`, type: "max_items" });
        }
        if (field.schema) {
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item !== "object" || item === null) continue;
            for (const [subKey, subField] of Object.entries(field.schema)) {
              this.validateField(
                `${path}[${i}].${subKey}`,
                subField,
                (item as Record<string, unknown>)[subKey],
                errors
              );
            }
          }
        }
        break;
    }
  }

  private checkXSS(path: string, value: string, errors: ContentValidationError[]): void {
    // Decode HTML entities before checking (prevent encoding bypass)
    const decoded = value
      .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&(lt|gt|amp|quot|apos);/gi, (m) => {
        const map: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&apos;": "'" };
        return map[m.toLowerCase()] || m;
      });

    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value) || pattern.test(decoded)) {
        errors.push({ path, message: "Potentially dangerous content detected", type: "xss" });
        return;
      }
    }
  }

  /**
   * Check if a text field contains a URL with a dangerous protocol.
   * This catches buttonLink, href fields stored as "text" type.
   */
  private checkUrl(path: string, value: string, errors: ContentValidationError[]): void {
    if (/^[a-z]+:/i.test(value) && safeUrl(value) === "#") {
      errors.push({ path, message: "Unsafe URL protocol", type: "invalid_url" });
    }
  }

  private sanitizeGroup(group: SchemaGroup, content: Record<string, unknown>): void {
    for (const [fieldKey, fieldDef] of Object.entries(group.fields)) {
      const value = content[fieldKey];
      if (value === undefined || value === null) continue;

      if (fieldDef.type === "text" || fieldDef.type === "textarea") {
        if (typeof value === "string") {
          content[fieldKey] = this.sanitizeString(value);
        }
      }

      if (fieldDef.type === "image") {
        if (typeof value === "string") {
          content[fieldKey] = safeUrl(value) === "#" ? "" : value;
        }
      }

      if (fieldDef.type === "array" && Array.isArray(value) && fieldDef.schema) {
        for (const item of value) {
          if (typeof item !== "object" || item === null) continue;
          for (const [subKey, subField] of Object.entries(fieldDef.schema)) {
            const subVal = (item as any)[subKey];
            if (subVal === undefined || subVal === null) continue;
            if ((subField.type === "text" || subField.type === "textarea") && typeof subVal === "string") {
              (item as any)[subKey] = this.sanitizeString(subVal);
            }
            if (subField.type === "image" && typeof subVal === "string") {
              (item as any)[subKey] = safeUrl(subVal) === "#" ? "" : subVal;
            }
          }
        }
      }
    }
  }

  /**
   * Strip ALL HTML using sanitize-html library (battle-tested).
   * Also handles encoded XSS payloads.
   */
  private sanitizeString(value: string): string {
    // sanitize-html strips all tags (allowedTags: [])
    const cleaned = sanitizeHtml(value, SANITIZE_OPTIONS);
    // Also neutralize javascript: protocol (even encoded)
    return cleaned.replace(/javascript\s*:/gi, "").replace(/vbscript\s*:/gi, "");
  }
}
