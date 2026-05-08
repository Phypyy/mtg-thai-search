import type {
  ScryfallCard,
  ScryfallCatalog,
  ScryfallError,
  ScryfallList,
} from "@/lib/types";

const SCRYFALL_BASE = "https://api.scryfall.com";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
  "User-Agent": "MTGThaiCardSearch/0.1 (educational; Next.js client)",
};

export class ScryfallRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ScryfallError,
  ) {
    super(message);
    this.name = "ScryfallRequestError";
  }
}

async function scryfallJson<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${SCRYFALL_BASE}${path}`;
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  const data = (await res.json()) as T | ScryfallError;

  if (!res.ok) {
    const err = data as ScryfallError;
    throw new ScryfallRequestError(
      err.details ?? err.code ?? res.statusText,
      res.status,
      err,
    );
  }

  return data as T;
}

/** Card name suggestions for autocomplete. */
export async function fetchAutocomplete(
  query: string,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const catalog = await scryfallJson<ScryfallCatalog>(
    `/cards/autocomplete?q=${encodeURIComponent(q)}`,
  );
  return catalog.data ?? [];
}

/** Single card by fuzzy English name. */
export async function fetchCardNamedFuzzy(name: string): Promise<ScryfallCard> {
  return scryfallJson<ScryfallCard>(
    `/cards/named?fuzzy=${encodeURIComponent(name.trim())}`,
  );
}

/** Search cards (first page only for this MVP). */
export async function searchCards(
  query: string,
): Promise<ScryfallList<ScryfallCard>> {
  const q = query.trim();
  return scryfallJson<ScryfallList<ScryfallCard>>(
    `/cards/search?q=${encodeURIComponent(q)}&unique=cards&order=name`,
  );
}
