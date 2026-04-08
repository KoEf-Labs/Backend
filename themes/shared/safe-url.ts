/**
 * Re-export URL sanitization from shared utils.
 * Single source of truth: src/shared/utils/index.ts
 * This file exists so theme components can import with relative paths.
 */
export { safeUrl, safeEmbedUrl } from "../../src/shared/utils";
