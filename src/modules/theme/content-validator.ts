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
  type: "missing" | "wrong_type" | "too_long" | "invalid_option" | "max_items" | "xss";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 500;
const MAX_TEXTAREA_LENGTH = 5000;
const MAX_URL_LENGTH = 2000;

// Patterns that indicate XSS attempts
const XSS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,       // onclick=, onerror=, etc.
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<form/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
];

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

    // Validate each schema group against content
    for (const [groupKey, group] of Object.entries(schema.groups)) {
      // Skip the sections toggle group — it's just booleans
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
   * Sanitize content — strip dangerous HTML from all text fields.
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
    // Skip undefined/null — fields are optional
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
        if (value && !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("/")) {
          errors.push({ path, message: `Invalid image URL`, type: "wrong_type" });
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
        // Validate each item against the array's inner schema
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
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value)) {
        errors.push({
          path,
          message: `Potentially dangerous content detected`,
          type: "xss",
        });
        return;
      }
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

      if (fieldDef.type === "array" && Array.isArray(value) && fieldDef.schema) {
        for (const item of value) {
          if (typeof item !== "object" || item === null) continue;
          for (const [subKey, subField] of Object.entries(fieldDef.schema)) {
            if ((subField.type === "text" || subField.type === "textarea") && typeof (item as any)[subKey] === "string") {
              (item as any)[subKey] = this.sanitizeString((item as any)[subKey]);
            }
          }
        }
      }
    }
  }

  private sanitizeString(value: string): string {
    return value
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
      .replace(/<embed[^>]*>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript\s*:/gi, "");
  }
}
