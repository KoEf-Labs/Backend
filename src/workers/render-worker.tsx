/**
 * Standalone render worker.
 * Called via: tsx render-worker.tsx <themeName>
 * Reads mockData from stdin or theme's mockData.json
 * Outputs HTML to stdout.
 */
import React from "react";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";

const THEMES_DIR = path.join(process.cwd(), "themes");

function loadTheme(name: string): React.ComponentType<{ data: any }> | null {
  const layoutPath = path.join(THEMES_DIR, name, "layout");
  try {
    const mod = require(layoutPath);
    return mod.default || mod;
  } catch {
    return null;
  }
}

// Read args
const themeName = process.argv[2];
const mode = process.argv[3] || "preview"; // "preview" or "stdin"

if (!themeName) {
  console.error(JSON.stringify({ error: "Usage: render-worker.tsx <theme> [preview|stdin]" }));
  process.exit(1);
}

const Component = loadTheme(themeName);
if (!Component) {
  console.error(JSON.stringify({ error: `Theme "${themeName}" not found` }));
  process.exit(1);
}

async function main() {
  let content: Record<string, unknown>;

  if (mode === "stdin") {
    // Read JSON from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf-8");
    try {
      content = JSON.parse(raw);
    } catch {
      console.error(JSON.stringify({ error: "Invalid JSON input on stdin" }));
      process.exit(1);
    }
  } else {
    // Use mockData.json
    const mockPath = path.join(THEMES_DIR, themeName, "mockData.json");
    if (!fs.existsSync(mockPath)) {
      console.error(JSON.stringify({ error: `mockData.json not found for "${themeName}"` }));
      process.exit(1);
    }
    content = JSON.parse(fs.readFileSync(mockPath, "utf-8"));
  }

  const heroData = content.hero as Record<string, unknown> | undefined;
  const navData = content.navbar as Record<string, unknown> | undefined;
  const title = (heroData?.title as string) || (navData?.logo as string) || "Website";
  const description = (heroData?.subtitle as string) || "";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const element = React.createElement(Component, { data: content });
  const body = renderToString(element);

  // Use prebuilt CSS if available, fallback to CDN
  const stylesPath = path.join(THEMES_DIR, themeName, "styles.css");
  const hasPrebuiltCss = fs.existsSync(stylesPath);
  const cssTag = hasPrebuiltCss
    ? `<style>${fs.readFileSync(stylesPath, "utf-8")}</style>`
    : `<script src="https://cdn.tailwindcss.com"></script>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${escapeHtml(description)}" />
  <title>${escapeHtml(title)}</title>
  ${cssTag}
  <style>html{scroll-behavior:smooth}body{-webkit-font-smoothing:antialiased}</style>
</head>
<body>
${body}
</body>
</html>`;

  process.stdout.write(html);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
