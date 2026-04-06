import { NextResponse } from "next/server";
import { SchemaService, SchemaError } from "./schema.service";

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
    const schema = service.getSchema(name);
    const raw = require(`../../../../themes/${name}/schema.json`);
    const result = service.validate(raw, name);
    return json({ theme: name, ...result });
  } catch (e) {
    if (e instanceof SchemaError) return error(e.message, e.status);
    return error("Internal server error", 500);
  }
}
