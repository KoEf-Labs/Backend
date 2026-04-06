import { NextResponse } from "next/server";

/**
 * Shared API response helpers.
 */
export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
