/**
 * Pre-translate all unique MTG oracle texts using the Gemini API.
 *
 * Usage:
 *   npx tsx scripts/pretranslate.ts                # translate all
 *   npx tsx scripts/pretranslate.ts --limit 10     # translate first 10 only
 *   npx tsx scripts/pretranslate.ts --delay 100    # 100ms between calls (paid tier)
 *
 * Resumes from existing data/translations.json — safe to ctrl+C and restart.
 */

import fs from "fs";
import path from "path";

/* ---------- Load .env.local ---------- */

function loadEnvFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — that's fine
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

/* ---------- Config ---------- */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const TRANSLATIONS_PATH = path.join(
  process.cwd(),
  "data",
  "translations.json",
);

const DEFAULT_DELAY_MS = 4_000; // 4s = ~15 RPM for free tier
const SAVE_EVERY = 20; // write to disk every N translations

/* ---------- CLI args ---------- */

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let delayMs = DEFAULT_DELAY_MS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      limit = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === "--delay" && args[i + 1]) {
      delayMs = parseInt(args[i + 1]!, 10);
      i++;
    }
  }

  return { limit, delayMs };
}

/* ---------- Scryfall bulk data ---------- */

type BulkDataEntry = {
  type: string;
  download_uri: string;
};

type BulkDataResponse = {
  data: BulkDataEntry[];
};

type ScryfallBulkCard = {
  oracle_id?: string;
  name: string;
  oracle_text?: string;
  card_faces?: { oracle_text?: string }[];
};

async function fetchBulkDownloadUrl(): Promise<string> {
  console.log("📡 Fetching Scryfall bulk data index...");
  const res = await fetch("https://api.scryfall.com/bulk-data", {
    headers: {
      Accept: "application/json",
      "User-Agent": "MTGThaiCardSearch/0.1 (pretranslate script)",
    },
  });
  const data = (await res.json()) as BulkDataResponse;
  const oracleCards = data.data.find((d) => d.type === "oracle_cards");
  if (!oracleCards) throw new Error("Could not find oracle_cards bulk data");
  return oracleCards.download_uri;
}

async function downloadBulkCards(url: string): Promise<ScryfallBulkCard[]> {
  console.log("⬇️  Downloading oracle cards (this may take a minute)...");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "MTGThaiCardSearch/0.1 (pretranslate script)",
    },
  });
  const cards = (await res.json()) as ScryfallBulkCard[];
  console.log(`   Downloaded ${cards.length} cards.`);
  return cards;
}

/* ---------- Extract unique oracle texts ---------- */

type OracleEntry = {
  oracleId: string;
  name: string;
  text: string;
};

function extractUniqueOracleTexts(cards: ScryfallBulkCard[]): OracleEntry[] {
  const seen = new Map<string, OracleEntry>();

  for (const card of cards) {
    if (!card.oracle_id) continue;
    if (seen.has(card.oracle_id)) continue;

    let text = card.oracle_text;
    if (!text && card.card_faces?.length) {
      text = card.card_faces
        .map((f) => f.oracle_text)
        .filter(Boolean)
        .join("\n//\n");
    }
    if (!text?.trim()) continue;

    seen.set(card.oracle_id, {
      oracleId: card.oracle_id,
      name: card.name,
      text: text.trim(),
    });
  }

  return Array.from(seen.values());
}

/* ---------- Gemini translation ---------- */

// Using the REST API directly to avoid dependency on @google/genai in scripts
async function translateWithGemini(text: string): Promise<string> {
  const prompt = [
    "You are translating Magic: The Gathering Oracle rules text.",
    "Translate from English to Thai.",
    "Requirements:",
    "- Keep mana symbols and braces unchanged, e.g. {W}, {2}{G/U}.",
    "- Preserve line breaks.",
    "- Do NOT translate MTG keywords (e.g. Flying, Trample, Lifelink) or spell types (e.g. Instant, Sorcery). Keep them in English.",
    "- Return only translated text with no explanation.",
    "",
    "Input text:",
    text,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!translated) throw new Error("Gemini returned empty response");
  return translated;
}

/* ---------- File I/O ---------- */

function loadExisting(): Record<string, string> {
  try {
    const raw = fs.readFileSync(TRANSLATIONS_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveTranslations(translations: Record<string, string>): void {
  const dir = path.dirname(TRANSLATIONS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    TRANSLATIONS_PATH,
    JSON.stringify(translations, null, 2),
    "utf-8",
  );
}

/* ---------- Main ---------- */

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY environment variable is required.");
    console.error("   Set it in .env.local or export it before running.");
    process.exit(1);
  }

  const { limit, delayMs } = parseArgs();
  console.log(`⚙️  Config: limit=${limit === Infinity ? "all" : limit}, delay=${delayMs}ms, model=${GEMINI_MODEL}`);

  // 1. Download bulk data
  const downloadUrl = await fetchBulkDownloadUrl();
  const cards = await downloadBulkCards(downloadUrl);

  // 2. Extract unique oracle texts
  const entries = extractUniqueOracleTexts(cards);
  console.log(`📋 Found ${entries.length} unique oracle texts.`);

  // 3. Load existing translations (for resume)
  const translations = loadExisting();
  const existingCount = Object.keys(translations).length;
  if (existingCount > 0) {
    console.log(`♻️  Resuming: ${existingCount} translations already cached.`);
  }

  // 4. Filter to untranslated entries
  const todo = entries
    .filter((e) => !translations[e.oracleId])
    .slice(0, limit);

  if (todo.length === 0) {
    console.log("✅ All oracle texts are already translated!");
    return;
  }

  console.log(`🚀 Translating ${todo.length} texts...\n`);

  let translated = 0;
  let errors = 0;

  for (const entry of todo) {
    const idx = translated + errors + 1;
    const progress = `[${idx}/${todo.length}]`;

    try {
      process.stdout.write(`${progress} ${entry.name}... `);
      const result = await translateWithGemini(entry.text);
      translations[entry.oracleId] = result;
      translated++;
      console.log("✅");

      // Periodic save
      if (translated % SAVE_EVERY === 0) {
        saveTranslations(translations);
        console.log(`   💾 Saved (${Object.keys(translations).length} total)`);
      }
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);

      // If rate limited, wait longer
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        console.log("   ⏳ Rate limited — waiting 60s before retry...");
        await sleep(60_000);
        // Don't count this as a permanent error — it'll be retried on next run
      }
    }

    // Delay between calls
    if (idx < todo.length) {
      await sleep(delayMs);
    }
  }

  // Final save
  saveTranslations(translations);

  console.log(`\n🏁 Done!`);
  console.log(`   ✅ Translated: ${translated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total cached: ${Object.keys(translations).length}`);
  console.log(`   📁 Saved to: ${TRANSLATIONS_PATH}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
