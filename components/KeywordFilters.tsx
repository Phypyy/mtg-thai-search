"use client";

export const MTG_KEYWORDS = [
  "flying",
  "trample",
  "lifelink",
  "deathtouch",
  "haste",
  "hexproof",
  "vigilance",
  "menace",
  "reach",
  "first strike",
  "double strike",
  "flash",
  "ward",
  "indestructible",
  "defender",
  "toxic",
];

type KeywordFiltersProps = {
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  disabled?: boolean;
};

export function KeywordFilters({
  selectedKeywords,
  onToggleKeyword,
  disabled,
}: KeywordFiltersProps) {
  const selectedSet = new Set(selectedKeywords);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          กรองตามคีย์เวิร์ด
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {MTG_KEYWORDS.map((k) => {
          const isSelected = selectedSet.has(k);
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onToggleKeyword(k)}
              className={`rounded-full border px-4 py-1.5 text-[14px] font-medium transition-colors ${
                isSelected
                  ? "border-cohere-coral bg-cohere-coral text-white dark:border-cohere-coral dark:bg-cohere-coral"
                  : "border-gray-200 bg-white text-cohere-ink hover:bg-gray-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
              } disabled:opacity-40`}
              aria-pressed={isSelected}
              title={`กรองด้วย ${k}`}
            >
              {k}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-cohere-slate">
        เมื่ออยากค้นหาด้วย Keyword ให้ใช้{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          keyword:XXX
        </code>
      </p>
    </div>
  );
}
