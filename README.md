# MTG Thai Card Search

Lightweight [Next.js](https://nextjs.org) app to search **Magic: The Gathering** cards via the [Scryfall API](https://scryfall.com/docs/api) and show a **Thai gloss** for common rules text using a client-side keyword map.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features (this iteration)

- **Autocomplete** — debounced card-name suggestions from `/cards/autocomplete`.
- **Named lookup** — selecting a suggestion loads `/cards/named?fuzzy=`.
- **Search** — submits a Scryfall `q` query to `/cards/search` (e.g. `keyword:flying`, `t:creature cmc=3`).
- **Thai keyword map** — longest-match replacement on `oracle_text`; remaining English-looking spans are **highlighted** for a future translation API.
- **Translate API stub** — `POST /api/translate` returns **501** until you wire `TRANSLATION_API_KEY` (see [`.env.example`](.env.example)).

## Scryfall etiquette

Card data is provided by Scryfall (not affiliated with Wizards of the Coast). Please:

- Cache responses when possible (this app uses [SWR](https://swr.vercel.app/) deduping).
- Space requests modestly; stay under ~10 requests/second as [documented](https://scryfall.com/docs/api).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4
- SWR for autocomplete fetching

## Next steps

- Wire **keyword filter pills** to Scryfall (`keyword:flying`, etc.).
- Implement **`/api/translate`** with OpenAI / DeepL using `TRANSLATION_API_KEY`.
- Render **mana symbols** with Scryfall SVG/collector data instead of raw `{W}` strings.
- Dedicated **card detail** route and tests/CI.

## License

MIT (project code). MTG card names and Oracle text are trademarks of Wizards of the Coast; data © Scryfall.
