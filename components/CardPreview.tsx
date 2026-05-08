"use client";

import type { ScryfallCard } from "@/lib/types";
import { translateOracleText, type TextRange } from "@/lib/translate";
import Image from "next/image";
import { useMemo, type ReactNode } from "react";

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

function Highlighted({
  text,
  ranges,
}: {
  text: string;
  ranges: TextRange[];
}) {
  if (!ranges.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let last = 0;
  ranges.forEach((r, i) => {
    if (r.start > last) {
      parts.push(
        <span key={`s-${i}-${last}`} className="text-zinc-800 dark:text-zinc-100">
          {text.slice(last, r.start)}
        </span>,
      );
    }
    parts.push(
      <mark
        key={`m-${i}`}
        className="rounded bg-amber-200/90 px-0.5 text-zinc-900 dark:bg-amber-800/50 dark:text-zinc-50"
        title="Likely needs machine translation"
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    last = r.end;
  });
  if (last < text.length) {
    parts.push(
      <span key={`e-${last}`} className="text-zinc-800 dark:text-zinc-100">
        {text.slice(last)}
      </span>,
    );
  }
  return <>{parts}</>;
}

export function CardPreview({ card }: { card: ScryfallCard }) {
  const img = getCardImage(card);
  const oracle = getOracleText(card);
  const thai = useMemo(
    () => translateOracleText(oracle ?? ""),
    [oracle],
  );

  const keywordChips = card.keywords ?? [];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative aspect-[63/88] w-full bg-zinc-100 dark:bg-zinc-950">
        {img ? (
          <Image
            src={img}
            alt={card.name}
            fill
            sizes="(max-width:768px) 100vw, 320px"
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <header>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {card.name}
          </h2>
          {card.mana_cost ? (
            <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">
              {card.mana_cost}
            </p>
          ) : null}
          {card.type_line ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {card.type_line}
            </p>
          ) : null}
        </header>
        {keywordChips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {keywordChips.map((kw) => {
              const t = translateOracleText(kw);
              return (
                <li
                  key={kw}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  title={kw}
                >
                  {t.translated !== kw ? t.translated : kw}
                </li>
              );
            })}
          </ul>
        )}
        {oracle ? (
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Oracle (EN)
              </h3>
              <pre className="whitespace-pre-wrap font-sans text-zinc-800 dark:text-zinc-100">
                {oracle}
              </pre>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Ability (TH — keyword map)
              </h3>
              <pre className="whitespace-pre-wrap font-sans leading-relaxed text-zinc-800 dark:text-zinc-100">
                <Highlighted text={thai.translated} ranges={thai.untranslatedRanges} />
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No oracle text on this card.</p>
        )}
      </div>
    </article>
  );
}
