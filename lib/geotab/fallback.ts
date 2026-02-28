/**
 * lib/geotab/fallback.ts
 *
 * Loads pre-cached JSON from /public/fallback/ when live API calls fail.
 * Route handlers call loadFallback(key) inside their catch blocks.
 *
 * Fallback files live at: public/fallback/<key>.json
 * Keys: "devices", "trips", "logs", "status"
 */

import { readFile } from "fs/promises";
import path from "path";

export async function loadFallback<T>(key: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "fallback", `${key}.json`);
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
