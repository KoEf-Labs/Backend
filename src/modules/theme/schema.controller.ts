import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SchemaService, SchemaError } from "./schema.service";
import { isValidThemeName } from "@/src/shared/utils";

const service = new SchemaService();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// GET /api/themes/:name/schema → parsed schema
export async function handleGetParsedSchema(name: string) {
  try {
    const schema = service.getSchema(name);
    return json(schema);
  } catch (e) {
    if (e instanceof SchemaError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// GET /api/themes/:name/fields → flat list of editable fields
export async function handleGetEditableFields(name: string) {
  try {
    const fields = service.getEditableFields(name);
    return json({ theme: name, count: fields.length, fields });
  } catch (e) {
    if (e instanceof SchemaError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}

// GET /api/themes/:name/validate → validate schema
export async function handleValidateSchema(name: string) {
  try {
    if (!isValidThemeName(name)) {
      return error("Invalid theme name", 400);
    }

    const schema = service.getSchema(name);
    const schemaPath = path.join(process.cwd(), "themes", name, "schema.json");
    if (!fs.existsSync(schemaPath)) {
      return error("Schema file not found", 404);
    }
    const raw = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    const result = service.validate(raw, name);
    return json({ theme: name, ...result });
  } catch (e) {
    if (e instanceof SchemaError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
