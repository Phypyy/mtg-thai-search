import { KEYWORD_THAI_MAP } from "@/lib/translate/keywords";
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type TranslateRequest = {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const MAX_TEXT_LENGTH = 5_000;
const DEFAULT_SOURCE = "en";
const DEFAULT_TARGET = "th";
const DEFAULT_GLOSSARY_LIMIT = 80;
const RESPONSE_CACHE_LIMIT = 500;
const responseCache = new Map<string, string>();

function createGlossary(maxItems: number): string {
  return Object.entries(KEYWORD_THAI_MAP)
    .slice(0, maxItems)
    .map(([en, th]) => `${en} => ${th}`)
    .join("\n");
}

function parseGlossaryLimit(): number {
  const raw = process.env.GEMINI_GLOSSARY_LIMIT;
  if (!raw) return DEFAULT_GLOSSARY_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_GLOSSARY_LIMIT;
  return Math.min(Math.floor(n), 200);
}

function getExtraGlossary(): string {
  const raw = process.env.GEMINI_GLOSSARY_EXTRA?.trim();
  return raw ? `\n${raw}` : "";
}

function buildPrompt(text: string, sourceLang: string, targetLang: string): string {
  const glossary = createGlossary(parseGlossaryLimit()) + getExtraGlossary();
  return [
    "You are translating Magic: The Gathering Oracle rules text.",
    `Translate from ${sourceLang} to ${targetLang}.`,
    "Requirements:",
    "- Keep mana symbols and braces unchanged, e.g. {W}, {2}{G/U}.",
    "- Preserve line breaks.",
    "- Preserve card/rules terms from the glossary exactly when applicable.",
    "- Do NOT translate MTG keywords (e.g. Flying, Trample, Lifelink) or spell types (e.g. Instant, Sorcery). Keep them in English.",
    "- Return only translated text with no explanation.",
    "",
    "Glossary (source => target):",
    glossary,
    "",
    "Input text:",
    text,
  ].join("\n");
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function makeCacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${DEFAULT_MODEL}|${sourceLang}|${targetLang}|${text}`;
}

function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (!cached) return null;
  // Touch entry for simple LRU-like behavior.
  responseCache.delete(cacheKey);
  responseCache.set(cacheKey, cached);
  return cached;
}

function setCachedResponse(cacheKey: string, translated: string): void {
  if (responseCache.size >= RESPONSE_CACHE_LIMIT) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(cacheKey, translated);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set." },
      { status: 501 },
    );
  }

  let body: TranslateRequest;
  try {
    body = (await request.json()) as TranslateRequest;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const text = body.text?.trim() ?? "";
  if (!text) return badRequest("`text` is required.");
  if (text.length > MAX_TEXT_LENGTH) {
    return badRequest("`text` is too long.");
  }

  const sourceLang = (body.sourceLang ?? DEFAULT_SOURCE).trim() || DEFAULT_SOURCE;
  const targetLang = (body.targetLang ?? DEFAULT_TARGET).trim() || DEFAULT_TARGET;
  const cacheKey = makeCacheKey(text, sourceLang, targetLang);
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return NextResponse.json({
      translated: cached,
      model: DEFAULT_MODEL,
      sourceLang,
      targetLang,
      cached: true,
    });
  }
  const prompt = buildPrompt(text, sourceLang, targetLang);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: { temperature: 0.1 },
    });
    const translated = response.text?.trim();
    if (!translated) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 },
      );
    }
    setCachedResponse(cacheKey, translated);

    return NextResponse.json({
      translated,
      model: DEFAULT_MODEL,
      sourceLang,
      targetLang,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
