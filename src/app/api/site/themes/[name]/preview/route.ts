import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isValidThemeName } from "@/src/shared/utils";

interface Params { params: Promise<{ name: string }> }

/**
 * GET /api/themes/:name/preview
 * Returns a mini HTML preview of the theme (lightweight, no full render).
 * Used as a thumbnail in the Flutter theme picker.
 */
export async function GET(_req: Request, { params }: Params) {
  const { name } = await params;

  if (!isValidThemeName(name)) {
    return NextResponse.json({ error: "Invalid theme name" }, { status: 400 });
  }

  const themesDir = path.join(process.cwd(), "themes");
  const mockPath = path.join(themesDir, name, "mockData.json");

  if (!fs.existsSync(mockPath)) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const data = JSON.parse(fs.readFileSync(mockPath, "utf-8"));

  // Theme-specific colors — try reading from meta.json, fallback to hardcoded
  const DEFAULT_COLORS = { bg: "#ffffff", accent: "#6366f1", text: "#111827", card: "#f3f4f6" };
  const KNOWN_COLORS: Record<string, typeof DEFAULT_COLORS> = {
    "startup-1": { bg: "#ffffff", accent: "#6366f1", text: "#111827", card: "#f3f4f6" },
    "startup-2": { bg: "#0f172a", accent: "#8b5cf6", text: "#ffffff", card: "rgba(255,255,255,0.05)" },
    "startup-3": { bg: "#020617", accent: "#06b6d4", text: "#ffffff", card: "rgba(6,182,212,0.08)" },
    "startup-4": { bg: "#FFF8F0", accent: "#f43f5e", text: "#111827", card: "#ffffff" },
    "startup-5": { bg: "#ffffff", accent: "#64748b", text: "#111827", card: "#f8fafc" },
  };

  // Try meta.json first (future-proof), fallback to known colors, then default
  let c = DEFAULT_COLORS;
  const metaPath = path.join(themesDir, name, "meta.json");
  if (fs.existsSync(metaPath)) {
    try { c = JSON.parse(fs.readFileSync(metaPath, "utf-8")).colors || c; } catch {}
  } else {
    c = KNOWN_COLORS[name] || DEFAULT_COLORS;
  }
  const heroTitle = data.hero?.title || data.hero?.slides?.[0]?.title || "Website";
  const heroSub = data.hero?.subtitle || data.hero?.slides?.[0]?.subtitle || "";
  const logo = data.navbar?.logo || name;
  const services = data.services?.items?.slice(0, 3) || [];

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=400">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:${c.bg}; color:${c.text}; font-family:-apple-system,sans-serif; width:400px; height:300px; overflow:hidden; }
  .nav { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid ${c.accent}20; }
  .nav-logo { font-size:11px; font-weight:700; color:${c.accent}; }
  .nav-btn { font-size:8px; background:${c.accent}; color:#fff; padding:3px 8px; border-radius:4px; }
  .hero { padding:20px 16px 16px; }
  .hero h1 { font-size:16px; font-weight:800; line-height:1.2; margin-bottom:6px; max-height:40px; overflow:hidden; }
  .hero p { font-size:8px; color:${c.text}99; line-height:1.4; max-height:24px; overflow:hidden; }
  .hero-btn { display:inline-block; margin-top:8px; font-size:7px; background:${c.accent}; color:#fff; padding:4px 10px; border-radius:4px; }
  .services { display:flex; gap:6px; padding:0 16px 16px; }
  .svc { flex:1; background:${c.card}; border-radius:6px; padding:8px; border:1px solid ${c.accent}10; }
  .svc-dot { width:16px; height:16px; background:${c.accent}20; border-radius:4px; margin-bottom:4px; }
  .svc-title { font-size:7px; font-weight:600; margin-bottom:2px; }
  .svc-desc { font-size:6px; color:${c.text}66; }
</style></head><body>
<div class="nav"><span class="nav-logo">${logo}</span><span class="nav-btn">Contact</span></div>
<div class="hero">
  <h1>${heroTitle}</h1>
  <p>${heroSub.substring(0, 100)}</p>
  <span class="hero-btn">Get Started →</span>
</div>
<div class="services">
  ${services.map((s: any) => `<div class="svc"><div class="svc-dot"></div><div class="svc-title">${s.title || ''}</div><div class="svc-desc">${(s.description || '').substring(0, 40)}</div></div>`).join('')}
</div>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
