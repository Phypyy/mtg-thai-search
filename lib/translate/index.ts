import { KEYWORD_THAI_MAP } from "@/lib/translate/keywords";

export type TextRange = { start: number; end: number };

export type TranslateResult = {
  original: string;
  translated: string;
  /** Regions in `translated` that still look like English (for LLM follow-up). */
  untranslatedRanges: TextRange[];
};

const SORTED_KEYS = Object.keys(KEYWORD_THAI_MAP).sort(
  (a, b) => b.length - a.length || a.localeCompare(b),
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Applies longest-match keyword / phrase replacements (case-insensitive).
 * Reminder text in parentheses is still processed by the same rules.
 */
export function translateOracleText(
  original: string | null | undefined,
): TranslateResult {
  if (!original?.trim()) {
    return { original: "", translated: "", untranslatedRanges: [] };
  }

  let translated = original;
  for (const key of SORTED_KEYS) {
    const value = KEYWORD_THAI_MAP[key];
    if (!value) continue;
    const hasWordCharsOnly =
      /^[\p{L}\p{N}]+$/u.test(key.replace(/\s+/g, "")) && !/\s/.test(key);
    const hasSpace = /\s/.test(key);
    const pattern =
      hasSpace || !hasWordCharsOnly
        ? new RegExp(escapeRegex(key), "gi")
        : new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
    translated = translated.replace(pattern, value);
  }
  translated = cleanupDanglingEnglishArticles(translated);

  return {
    original,
    translated,
    untranslatedRanges: findLatinWordRanges(translated),
  };
}

/**
 * Remove dangling English articles that can remain after partial phrase mapping,
 * e.g. "a ครีเจอร์" -> "ครีเจอร์".
 */
function cleanupDanglingEnglishArticles(text: string): string {
  return text
    .replace(/\b(?:a|an)\s+(?=[\u0E00-\u0E7F])/gi, "")
    .replace(/\s{2,}/g, " ");
}

/** Latin letter runs (4+ chars) outside `{mana}` snippets — likely still English. */
function findLatinWordRanges(text: string): TextRange[] {
  const ranges: TextRange[] = [];
  const re = /\{[^}]+\}|[A-Za-z][A-Za-z'’\-]{3,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].startsWith("{")) continue;
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return mergeAdjacentRanges(ranges);
}

function mergeAdjacentRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length === 0) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: TextRange[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1]!;
    const cur = sorted[i]!;
    if (cur.start <= prev.end + 1) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      out.push(cur);
    }
  }
  return out;
}
