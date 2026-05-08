"use client";

import { CardGrid } from "@/components/CardGrid";
import { KeywordFilters } from "@/components/KeywordFilters";
import { SearchBar } from "@/components/SearchBar";
import {
  ScryfallRequestError,
  fetchCardNamedFuzzy,
  searchCards,
} from "@/lib/scryfall";
import type { ScryfallCard } from "@/lib/types";
import { useCallback, useState } from "react";

export default function Home() {
  const [cards, setCards] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectCard = useCallback(async (name: string) => {
    setError(null);
    setLoading(true);
    try {
      const card = await fetchCardNamedFuzzy(name);
      setCards((prev) => {
        if (prev.some((c) => c.id === card.id)) return prev;
        return [card, ...prev];
      });
    } catch (e) {
      const msg =
        e instanceof ScryfallRequestError
          ? e.message
          : "Could not load that card.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(async (query: string) => {
    setError(null);
    setLoading(true);
    try {
      const list = await searchCards(query);
      setCards(list.data);
    } catch (e) {
      const msg =
        e instanceof ScryfallRequestError
          ? e.message
          : "Search failed. Try another query.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 text-center sm:text-left">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Scryfall · Thai keyword gloss
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            MTG Thai Card Search
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400 sm:mx-0">
            Search Magic cards by name with autocomplete, or run a Scryfall
            query (e.g.{" "}
            <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
              keyword:flying
            </code>
            ). Abilities are partially translated via a keyword map; highlighted
            segments may need an API pass later.
          </p>
        </header>

        <section className="mb-8 flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SearchBar
            onSelectCard={handleSelectCard}
            onSearchSubmit={handleSearchSubmit}
            disabled={loading}
          />
          <KeywordFilters />
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="mb-6 text-center text-sm text-zinc-500">Loading…</p>
        )}

        <CardGrid cards={cards} />
      </div>
    </div>
  );
}
