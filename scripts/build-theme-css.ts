/**
 * Build Tailwind CSS for each theme.
 * Run: npx tsx scripts/build-theme-css.ts
 *
 * Scans each theme's layout.tsx + components for Tailwind classes
 * and generates a minified CSS file at themes/<name>/styles.css
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const THEMES_DIR = path.join(process.cwd(), "themes");

const themes = fs
  .readdirSync(THEMES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("shared"))
  .map((d) => d.name);

console.log(`Building CSS for ${themes.length} themes...\n`);

for (const theme of themes) {
  const themeDir = path.join(THEMES_DIR, theme);
  const outputPath = path.join(themeDir, "styles.css");

  // Create a minimal tailwind config for this theme
  const configPath = path.join(themeDir, "_tailwind.config.cjs");
  const config = `module.exports = {
  content: [
    "${themeDir.replace(/\\/g, "/")}/**/*.{tsx,jsx,ts,js}",
    "${path.join(THEMES_DIR, "shared").replace(/\\/g, "/")}/**/*.{tsx,jsx,ts,js}",
  ],
  theme: { extend: {} },
  plugins: [],
};`;

  fs.writeFileSync(configPath, config);

  // Create input CSS
  const inputCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
  const inputPath = path.join(themeDir, "_input.css");
  fs.writeFileSync(inputPath, inputCss);

  try {
    execSync(
      `npx tailwindcss -c "${configPath}" -i "${inputPath}" -o "${outputPath}" --minify`,
      { stdio: "pipe", cwd: process.cwd() }
    );
    const size = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`  ✓ ${theme} → styles.css (${size} KB)`);
  } catch (e: any) {
    console.error(`  ✗ ${theme} failed: ${e.message}`);
  }

  // Clean up temp files
  fs.unlinkSync(configPath);
  fs.unlinkSync(inputPath);
}

console.log("\nDone!");
