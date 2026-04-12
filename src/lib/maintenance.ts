import { redis, isRedisAvailable } from "./redis";

/**
 * Check if site-serving endpoints (/api/site/live, /api/site/preview/*)
 * should return a maintenance page. Read from Redis on every request.
 *
 * - Returns { enabled: false } when Redis is down so an outage doesn't
 *   trap sites in maintenance.
 * - Cached inside the function for 5s to avoid hammering Redis during
 *   traffic bursts.
 */

interface MaintenanceState {
  enabled: boolean;
  message: string | null;
}

let cache: { state: MaintenanceState; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5000;

export async function getMaintenanceState(): Promise<MaintenanceState> {
  if (cache && cache.expiresAt > Date.now()) return cache.state;
  if (!redis || !isRedisAvailable()) {
    const fallback: MaintenanceState = { enabled: false, message: null };
    cache = { state: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }
  try {
    const [enabled, message] = await Promise.all([
      redis.get("maintenance:enabled"),
      redis.get("maintenance:message"),
    ]);
    const state: MaintenanceState = {
      enabled: enabled === "1",
      message: message ?? null,
    };
    cache = { state, expiresAt: Date.now() + CACHE_TTL_MS };
    return state;
  } catch {
    const fallback: MaintenanceState = { enabled: false, message: null };
    cache = { state: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
    return fallback;
  }
}

/**
 * Render a minimal HTML page shown to end users when maintenance is on.
 */
export function maintenanceHtml(message: string | null): string {
  const msg =
    message ??
    "Sistem bakımda. Kısa süre içinde tekrar hizmetinizdeyiz.";
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bakım modu</title>
<style>
  body { font-family: system-ui,-apple-system,sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; }
  .box { max-width:480px; text-align:center; }
  h1 { font-size:24px; font-weight:600; margin-bottom:12px; color:#fff; }
  p { font-size:15px; line-height:1.6; color:#94a3b8; }
  .dot { display:inline-block; width:8px; height:8px; background:#f59e0b; border-radius:50%; margin-right:8px; animation:pulse 2s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }
</style>
</head>
<body>
  <div class="box">
    <h1><span class="dot"></span>Bakım Modu</h1>
    <p>${escapeHtml(msg)}</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
