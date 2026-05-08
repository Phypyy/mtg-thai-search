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
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

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
          : "ไม่สามารถโหลดการ์ดที่เลือกได้";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(async (query: string) => {
    setError(null);
    setLoading(true);
    setSelectedKeywords([]);
    try {
      const list = await searchCards(query);
      setCards(list.data);
    } catch (e) {
      const msg =
        e instanceof ScryfallRequestError
          ? e.message
          : "ค้นหาไม่สำเร็จ ลองเปลี่ยนคำค้นหาอีกครั้ง";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const runKeywordSearch = useCallback(async (keywords: string[]) => {
    if (keywords.length === 0) {
      setCards([]);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const query = keywords.map((k) => `keyword:${k}`).join(" ");
      const list = await searchCards(query);
      setCards(list.data);
    } catch (e) {
      const msg =
        e instanceof ScryfallRequestError
          ? e.message
          : "ค้นหาจากคีย์เวิร์ดไม่สำเร็จ ลองคีย์เวิร์ดอื่น";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleKeyword = useCallback(
    (keyword: string) => {
      setSelectedKeywords((prev) => {
        const next = prev.includes(keyword)
          ? prev.filter((k) => k !== keyword)
          : [...prev, keyword];
        void runKeywordSearch(next);
        return next;
      });
    },
    [runKeywordSearch],
  );

  const handleClearKeywords = useCallback(() => {
    setSelectedKeywords([]);
    setCards([]);
    setError(null);
  }, []);

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-16 text-center sm:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-cohere-coral">
            ฐานข้อมูลคีย์เวิร์ดและการ์ด MTG ภาษาไทย
          </p>
          <h1 className="mt-4 font-display text-5xl leading-none tracking-[-1.44px] text-cohere-ink dark:text-zinc-50 sm:text-[72px]">
            ค้นหาการ์ด Magic: The Gathering
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 sm:mx-0">
            ฐานข้อมูลการ์ด Magic: The Gathering (MTG) — Powered by Scryfall
          </p>
        </header>

        <section className="mb-16 flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <SearchBar
              onSelectCard={handleSelectCard}
              onSearchSubmit={handleSearchSubmit}
              disabled={loading}
            />
            {(selectedKeywords.length > 0 || cards.length > 0) && (
              <div className="flex justify-end sm:justify-start">
                <button
                  type="button"
                  onClick={handleClearKeywords}
                  disabled={loading}
                  className="text-[14px] font-medium text-cohere-coral hover:underline disabled:opacity-40"
                >
                  ล้างการค้นหาทั้งหมด {selectedKeywords.length > 0 ? `(${selectedKeywords.length})` : ""}
                </button>
              </div>
            )}
          </div>
          <KeywordFilters
            selectedKeywords={selectedKeywords}
            onToggleKeyword={handleToggleKeyword}
            disabled={loading}
          />
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
          <p className="mb-6 text-center text-sm text-zinc-500">กำลังโหลด…</p>
        )}

        <CardGrid cards={cards} />
      </div>
    </div>
  );
}
