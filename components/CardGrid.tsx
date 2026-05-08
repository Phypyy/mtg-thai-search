"use client";

import type { ScryfallCard } from "@/lib/types";
import { CardPreview } from "@/components/CardPreview";

export function CardGrid({ cards }: { cards: ScryfallCard[] }) {
  if (cards.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Pick a suggestion or run a search to see cards here. Try{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          keyword:flying
        </code>{" "}
        for tag-style search.
      </p>
    );
  }

  return (
    <ul className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <li key={card.id}>
          <CardPreview card={card} />
        </li>
      ))}
    </ul>
  );
}
