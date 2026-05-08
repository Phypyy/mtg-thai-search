"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchAutocomplete } from "@/lib/scryfall";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import useSWR from "swr";

export type SearchBarProps = {
  onSelectCard: (name: string) => void;
  onSearchSubmit: (query: string) => void;
  disabled?: boolean;
};

const AUTOCOMPLETE_LIMIT = 10;
const DEBOUNCE_MS = 200;
const KEYWORDS = ["keyword", "set", "type", "color", "mana", "pow", "tou", "rarity", "format", "art", "is"];


export function SearchBar({
  onSelectCard,
  onSearchSubmit,
  disabled,
}: SearchBarProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [keywordIndex, setKeywordIndex] = useState(0);
  const debounced = useDebounce(value, DEBOUNCE_MS);

  useEffect(() => {
    const timer = setInterval(() => {
      setKeywordIndex((prev) => (prev + 1) % KEYWORDS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const shouldFetch = debounced.trim().length >= 2;
  const { data: suggestions = [], isLoading } = useSWR(
    shouldFetch ? ["scryfall-autocomplete", debounced] : null,
    ([, q]) => fetchAutocomplete(q),
    { revalidateOnFocus: false, dedupingInterval: 500 },
  );

  const visible = open && shouldFetch && suggestions.length > 0;
  const list = suggestions.slice(0, AUTOCOMPLETE_LIMIT);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const pick = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setValue(trimmed);
      setOpen(false);
      setHighlight(-1);
      onSelectCard(trimmed);
      inputRef.current?.blur();
    },
    [onSelectCard],
  );

  const submitSearch = useCallback(() => {
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    setHighlight(-1);
    onSearchSubmit(q);
  }, [value, onSearchSubmit]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!visible) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitSearch();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1 >= list.length ? 0 : h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? list.length - 1 : h - 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setHighlight(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && list[highlight]) {
        pick(list[highlight]!);
      } else {
        submitSearch();
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <label htmlFor={listId} className="sr-only">
        ค้นหาการ์ด Magic ด้วยชื่อ
      </label>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            id={listId}
            type="search"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            role="combobox"
            aria-expanded={visible}
            aria-controls={`${listId}-listbox`}
            aria-autocomplete="list"
            aria-activedescendant={
              visible && highlight >= 0
                ? `${listId}-option-${highlight}`
                : undefined
            }
            placeholder=" "
            className="peer w-full rounded-full border border-cohere-hairline bg-white px-6 py-3 text-base text-cohere-ink shadow-none outline-none focus-visible:ring-2 focus-visible:ring-cohere-focus disabled:opacity-50 dark:border-zinc-700 dark:bg-cohere-primary dark:text-zinc-50"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          <div className="pointer-events-none absolute inset-0 hidden items-center px-6 text-base text-zinc-400 peer-placeholder-shown:flex dark:text-zinc-500">
            ค้นหาชื่อการ์ด หรือ{" "}
            <span className="relative ml-1 inline-flex h-[1.5em] w-28 flex-col overflow-hidden">
              {KEYWORDS.map((kw, i) => {
                const isActive = i === keywordIndex;
                const isPrev =
                  i === (keywordIndex - 1 + KEYWORDS.length) % KEYWORDS.length;

                let transform = "translateY(100%)";
                let opacity = 0;

                if (isActive) {
                  transform = "translateY(0)";
                  opacity = 1;
                } else if (isPrev) {
                  transform = "translateY(-100%)";
                  opacity = 0;
                }

                return (
                  <span
                    key={kw}
                    className="absolute left-0 top-0 transition-all duration-500 ease-in-out"
                    style={{ transform, opacity }}
                  >
                    {kw}...
                  </span>
                );
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submitSearch}
          className="w-full rounded-full bg-cohere-primary px-6 py-3 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40 dark:bg-white dark:text-cohere-primary dark:hover:bg-gray-200 sm:w-auto"
        >
          ค้นหา
        </button>
      </div>
      {visible && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-md border border-cohere-hairline bg-white py-1 text-cohere-ink shadow-sm dark:border-zinc-700 dark:bg-cohere-primary dark:text-zinc-50"
        >
          {list.map((name, i) => (
            <li
              key={`${name}-${i}`}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                i === highlight ? "bg-[#f1f5ff] dark:bg-zinc-800" : ""
              }`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
      {shouldFetch && isLoading && (
        <p className="mt-2 text-xs text-zinc-500">กำลังโหลดชื่อการ์ด…</p>
      )}
    </div>
  );
}
