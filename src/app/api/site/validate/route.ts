import { NextRequest, NextResponse } from "next/server";
import { ContentValidator } from "@/src/modules/theme/content-validator";

const validator = new ContentValidator();

/**
 * POST /api/validate
 * Body: { "theme": "startup-1", "content": { ... } }
 * Returns: { "valid": true/false, "errors": [...] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.theme) {
      return NextResponse.json({ error: "Missing 'theme'" }, { status: 400 });
    }
    if (!body.content) {
      return NextResponse.json({ error: "Missing 'content'" }, { status: 400 });
    }

    const result = validator.validateContent(body.theme, body.content);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
