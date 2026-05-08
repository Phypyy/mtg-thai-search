"use client";

import type { ScryfallCard } from "@/lib/types";
import { CardPreview } from "@/components/CardPreview";
import Image from "next/image";
import { useEffect, useState } from "react";

function getCardImage(card: ScryfallCard): string | undefined {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
}

export function CardGrid({ cards }: { cards: ScryfallCard[] }) {
  const [selected, setSelected] = useState<ScryfallCard | null>(null);

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    if (!selected) return;
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [selected]);

  if (cards.length === 0) {
    return (
      <p className="text-center text-sm text-cohere-slate">
        เลือกจากรายการแนะนำหรือพิมพ์เพื่อค้นหาการ์ดที่นี่ คุณสามารถใช้ Scryfall Syntax เช่น{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          t:creature
        </code>{" "}
        หรือ{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          id:uw
        </code>{" "}
        เพื่อการค้นหาที่แม่นยำยิ่งขึ้น
      </p>
    );
  }

  return (
    <>
      <ul className="grid list-none gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => {
          const img = getCardImage(card);
          return (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => setSelected(card)}
                className="group block w-full overflow-hidden rounded-[8px] border border-cohere-hairline bg-white transition-colors hover:border-gray-400 dark:border-zinc-800 dark:bg-zinc-900"
                aria-label={`เปิดรายละเอียดการ์ด ${card.name}`}
              >
                <div className="relative aspect-[63/88] w-full bg-zinc-100 dark:bg-zinc-950">
                  {img ? (
                    <Image
                      src={img}
                      alt={card.name}
                      fill
                      sizes="(max-width:768px) 50vw, 25vw"
                      className="object-contain p-2 transition group-hover:scale-[1.01]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      ไม่มีรูปภาพ
                    </div>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-5xl rounded-[22px] border border-cohere-hairline bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-cohere-primary md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-cohere-hairline px-4 py-1.5 text-sm font-medium text-cohere-ink hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ปิด
              </button>
            </div>
            <CardPreview card={selected} />
          </div>
        </div>
      )}
    </>
  );
}
