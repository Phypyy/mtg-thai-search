"use client";

const SAMPLE_KEYWORDS = [
  "flying",
  "trample",
  "lifelink",
  "deathtouch",
  "haste",
  "hexproof",
];

/**
 * Stub: keyword pills for future `keyword:` Scryfall wiring.
 */
export function KeywordFilters() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Keyword filters{" "}
        <span className="font-normal normal-case text-zinc-400">(soon)</span>
      </p>
      <div className="flex flex-wrap gap-2 opacity-60">
        {SAMPLE_KEYWORDS.map((k) => (
          <button
            key={k}
            type="button"
            disabled
            title="Will filter Scryfall search in a follow-up"
            className="cursor-not-allowed rounded-full border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
