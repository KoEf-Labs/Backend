import fs from "fs";
import path from "path";
import { MemoryCache } from "@/src/lib/cache";
import { isValidThemeName } from "@/src/shared/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const VALID_FIELD_TYPES = [
  "text", "textarea", "image", "toggle", "select", "array", "group", "sectionToggles",
] as const;

type FieldType = (typeof VALID_FIELD_TYPES)[number];

export interface SchemaField {
  type: FieldType;
  label: string;
  placeholder?: string;
  default?: unknown;
  options?: string[];
  maxItems?: number;
  schema?: Record<string, SchemaField>;
  fields?: Record<string, SchemaField>;
}

export interface ParsedSchema {
  themeName: string;
  sections: string[];
  groups: Record<string, SchemaGroup>;
}

export interface SchemaGroup {
  label: string;
  type: string;
  fields: Record<string, SchemaField>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EditableField {
  path: string;
  group: string;
  groupLabel: string;
  key: string;
  type: string;
  label: string;
  placeholder?: string;
  options?: string[];
  maxItems?: number;
  hasNestedSchema: boolean;
}

// ---------------------------------------------------------------------------
// Cache — 5 minute TTL, shared across all requests
// ---------------------------------------------------------------------------

const schemaCache = new MemoryCache<ParsedSchema>(300);
const fieldsCache = new MemoryCache<EditableField[]>(300);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THEMES_DIR = path.join(process.cwd(), "themes");

function schemaPath(themeName: string): string {
  return path.join(THEMES_DIR, themeName, "schema.json");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SchemaService {
  /**
   * Load and parse schema.json for a theme.
   * Cached for 5 minutes.
   */
  getSchema(themeName: string): ParsedSchema {
    if (!isValidThemeName(themeName)) {
      throw new SchemaError(`Invalid theme name`, 400);
    }

    // Check cache first
    const cached = schemaCache.get(themeName);
    if (cached) return cached;

    // Read from disk
    const filePath = schemaPath(themeName);

    if (!fs.existsSync(filePath)) {
      throw new SchemaError(`Schema not found for theme "${themeName}"`, 404);
    }

    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const validation = this.validate(raw, themeName);
    if (!validation.valid) {
      throw new SchemaError(
        `Invalid schema for "${themeName}": ${validation.errors.join("; ")}`,
        422
      );
    }

    const sectionNames = raw.sections?.fields
      ? Object.keys(raw.sections.fields)
      : [];

    const groups: Record<string, SchemaGroup> = {};
    for (const [key, value] of Object.entries(raw)) {
      const group = value as Record<string, unknown>;
      groups[key] = {
        label: (group.label as string) || key,
        type: (group.type as string) || "group",
        fields: (group.fields as Record<string, SchemaField>) || {},
      };
    }

    const parsed: ParsedSchema = { themeName, sections: sectionNames, groups };

    // Store in cache
    schemaCache.set(themeName, parsed);

    return parsed;
  }

  /**
   * Get flat list of editable fields.
   * Cached for 5 minutes.
   */
  getEditableFields(themeName: string): EditableField[] {
    const cached = fieldsCache.get(themeName);
    if (cached) return cached;

    const schema = this.getSchema(themeName);
    const fields: EditableField[] = [];

    for (const [groupKey, group] of Object.entries(schema.groups)) {
      if (groupKey === "sections") continue;

      for (const [fieldKey, field] of Object.entries(group.fields)) {
        fields.push({
          path: `${groupKey}.${fieldKey}`,
          group: groupKey,
          groupLabel: group.label,
          key: fieldKey,
          type: field.type,
          label: field.label,
          placeholder: field.placeholder,
          options: field.options,
          maxItems: field.maxItems,
          hasNestedSchema: !!field.schema,
        });
      }
    }

    fieldsCache.set(themeName, fields);

    return fields;
  }

  /**
   * Clear cache for a specific theme or all themes.
   */
  clearCache(themeName?: string): void {
    if (themeName) {
      schemaCache.invalidate(themeName);
      fieldsCache.invalidate(themeName);
    } else {
      schemaCache.clear();
      fieldsCache.clear();
    }
  }

  /**
   * Validate schema.json structure.
   */
  validate(
    schema: Record<string, unknown>,
    themeName = "unknown"
  ): ValidationResult {
    const errors: string[] = [];

    if (typeof schema !== "object" || schema === null) {
      return { valid: false, errors: ["Schema must be a JSON object"] };
    }

    for (const [groupKey, groupValue] of Object.entries(schema)) {
      const group = groupValue as Record<string, unknown>;

      if (!group.type) {
        errors.push(`Group "${groupKey}" is missing "type"`);
        continue;
      }

      const groupType = group.type as string;
      if (!VALID_FIELD_TYPES.includes(groupType as FieldType)) {
        errors.push(`Group "${groupKey}" has invalid type "${groupType}"`);
      }

      const fields = group.fields as Record<string, unknown> | undefined;
      if (fields) {
        this.validateFields(fields, groupKey, errors);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateFields(
    fields: Record<string, unknown>,
    parentPath: string,
    errors: string[]
  ): void {
    for (const [key, value] of Object.entries(fields)) {
      const field = value as Record<string, unknown>;
      const fieldPath = `${parentPath}.${key}`;

      if (!field.type) {
        errors.push(`Field "${fieldPath}" is missing "type"`);
        continue;
      }

      const fieldType = field.type as string;
      if (!VALID_FIELD_TYPES.includes(fieldType as FieldType)) {
        errors.push(`Field "${fieldPath}" has invalid type "${fieldType}"`);
      }

      if (field.schema) {
        this.validateFields(field.schema as Record<string, unknown>, fieldPath, errors);
      }
      if (field.fields) {
        this.validateFields(field.fields as Record<string, unknown>, fieldPath, errors);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class SchemaError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SchemaError";
    this.status = status;
  }
}
