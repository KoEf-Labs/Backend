import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Shared API response helpers.
 */
export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Validate theme name: alphanumeric, hyphens, underscores only.
 * Prevents path traversal attacks.
 */
const THEME_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function isValidThemeName(name: string): boolean {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 50 &&
    THEME_NAME_REGEX.test(name)
  );
}

const THEMES_DIR = path.join(process.cwd(), "themes");

/**
 * Validate theme name format AND check it exists on disk.
 * Returns cleaned name or null.
 */
export function validateThemeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!isValidThemeName(cleaned)) return null;
  const themeDir = path.join(THEMES_DIR, cleaned);
  if (!fs.existsSync(themeDir) || !fs.statSync(themeDir).isDirectory()) {
    return null;
  }
  return cleaned;
}
