"use client";

import type { ScryfallCard } from "@/lib/types";
import { translateOracleText } from "@/lib/translate";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const geminiMemoryCache = new Map<string, string>();
const LOCAL_CACHE_PREFIX = "mtgth:gemini:th:";

function getCardImage(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal
  );
}

function getOracleText(card: ScryfallCard): string | undefined {
  if (card.oracle_text) return card.oracle_text;
  const faces = card.card_faces;
  if (!faces?.length) return undefined;
  return faces.map((f) => f.oracle_text).filter(Boolean).join("\n//\n");
}

function makeCacheKey(text: string, sourceLang: string, targetLang: string): string {
  return `${sourceLang}:${targetLang}:${text}`;
}

function getCachedTranslation(key: string): string | null {
  const inMemory = geminiMemoryCache.get(key);
  if (inMemory) return inMemory;

  if (typeof window === "undefined") return null;
  const inLocalStorage = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${key}`);
  if (inLocalStorage) {
    geminiMemoryCache.set(key, inLocalStorage);
    return inLocalStorage;
  }
  return null;
}

function setCachedTranslation(key: string, translated: string): void {
  geminiMemoryCache.set(key, translated);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${LOCAL_CACHE_PREFIX}${key}`, translated);
  } catch {
    // ignore storage quota errors
  }
}

function symbolUrl(token: string): string {
  const symbol = token.slice(1, -1).trim().toUpperCase().replace(/\s+/g, "");
  return `https://svgs.scryfall.io/card-symbols/${symbol}.svg`;
}

function RulesText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="whitespace-pre-wrap">
      {lines.map((line, lineIndex) => {
        const chunks = line.split(/(\{[^}]+\})/g);
        return (
          <span key={`ln-${lineIndex}`}>
            {chunks.map((chunk, idx) => {
              if (/^\{[^}]+\}$/.test(chunk)) {
                return (
                  <Image
                    key={`sym-${lineIndex}-${idx}-${chunk}`}
                    src={symbolUrl(chunk)}
                    alt={chunk}
                    width={16}
                    height={16}
                    className="mx-0.5 inline-block align-[-2px]"
                  />
                );
              }
              return <span key={`txt-${lineIndex}-${idx}`}>{chunk}</span>;
            })}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        );
      })}
    </div>
  );
}

export function CardPreview({ card }: { card: ScryfallCard }) {
  const img = getCardImage(card);
  const oracle = getOracleText(card);
  const thai = useMemo(
    () => translateOracleText(oracle ?? ""),
    [oracle],
  );
  const [geminiThai, setGeminiThai] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function maybeTranslate() {
      setGeminiThai(null);
      if (!oracle || thai.untranslatedRanges.length === 0) return;
      const cacheKey = makeCacheKey(oracle, "en", "th");
      const cached = getCachedTranslation(cacheKey);
      if (cached) {
        setGeminiThai(cached);
        return;
      }
      setIsGeminiLoading(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: oracle, sourceLang: "en", targetLang: "th" }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { translated?: string };
        if (!cancelled && data.translated?.trim()) {
          const translated = data.translated.trim();
          setCachedTranslation(cacheKey, translated);
          setGeminiThai(translated);
        }
      } catch {
        // best-effort enhancement; keep keyword-map output
      } finally {
        if (!cancelled) setIsGeminiLoading(false);
      }
    }
    void maybeTranslate();
    return () => {
      cancelled = true;
    };
  }, [oracle, thai.untranslatedRanges.length]);

  return (
    <div className="grid max-h-[85vh] gap-4 overflow-y-auto md:grid-cols-[260px_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-[63/88] w-full max-w-[260px] rounded-[22px] bg-zinc-100 dark:bg-zinc-950">
        {img ? (
          <Image
            src={img}
            alt={card.name}
            fill
            sizes="260px"
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            ไม่มีรูปภาพ
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <header>
          <h2 className="font-display text-3xl font-normal tracking-[-0.32px] text-cohere-ink dark:text-zinc-50">
            {card.name}
          </h2>
          {card.mana_cost ? (
            <p className="mt-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
              <RulesText text={card.mana_cost} />
            </p>
          ) : null}
          {card.type_line ? (
            <p className="mt-1 text-sm text-cohere-slate dark:text-zinc-400">
              {card.type_line}
            </p>
          ) : null}
        </header>
        {oracle ? (
          <div className="grid gap-4 text-base md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[14px] font-medium uppercase tracking-wide text-cohere-slate">
                EN
              </h3>
              <div className="rounded-lg border border-cohere-hairline bg-white p-4 font-sans leading-relaxed text-cohere-ink dark:border-zinc-800 dark:bg-cohere-primary dark:text-zinc-100">
                <RulesText text={oracle} />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-[14px] font-medium uppercase tracking-wide text-cohere-slate">
                TH
              </h3>
              <div className="rounded-lg border border-cohere-hairline bg-white p-4 font-sans leading-relaxed text-cohere-ink dark:border-zinc-800 dark:bg-cohere-primary dark:text-zinc-100">
                <RulesText text={geminiThai ?? thai.translated} />
              </div>
              {isGeminiLoading && (
                <p className="mt-2 text-xs text-zinc-500">
                  กำลังแปลด้วย Gemini + Glossary...
                </p>
              )}
              {!geminiThai && thai.untranslatedRanges.length > 0 && !isGeminiLoading && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  แสดงผลจาก keyword map ชั่วคราว
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">การ์ดนี้ไม่มีข้อความความสามารถ</p>
        )}
      </div>
    </div>
  );
}
