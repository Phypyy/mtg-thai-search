import fs from "fs";
import path from "path";

const TRANSLATIONS_PATH = path.join(
  process.cwd(),
  "data",
  "translations.json",
);

let cache: Record<string, string> | null = null;

function loadCache(): Record<string, string> {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(TRANSLATIONS_PATH, "utf-8");
    cache = JSON.parse(raw) as Record<string, string>;
  } catch {
    cache = {};
  }
  return cache;
}

/**
 * Look up a pre-translated oracle text by oracle_id.
 * Returns the Thai translation or null if not cached.
 */
export function getCachedTranslation(oracleId: string): string | null {
  const store = loadCache();
  return store[oracleId] ?? null;
}

/**
 * Returns true if the translations cache has any entries.
 */
export function hasCachedTranslations(): boolean {
  const store = loadCache();
  return Object.keys(store).length > 0;
}
