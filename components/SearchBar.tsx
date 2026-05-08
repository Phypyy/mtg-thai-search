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
  const debounced = useDebounce(value, DEBOUNCE_MS);

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
        Search Magic cards by name
      </label>
      <div className="flex gap-2">
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
          placeholder="Search card name (autocomplete) or Scryfall query…"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setHighlight(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={submitSearch}
          className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-40"
        >
          Search
        </button>
      </div>
      {visible && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {list.map((name, i) => (
            <li
              key={`${name}-${i}`}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`cursor-pointer px-4 py-2 text-sm ${
                i === highlight ? "bg-amber-100 dark:bg-amber-900/40" : ""
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
        <p className="mt-2 text-xs text-zinc-500">Loading names…</p>
      )}
    </div>
  );
}
