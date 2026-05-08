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
- **Thai keyword map** — longest-match replacement on `oracle_text`; remaining English-looking spans are highlighted.
- **Gemini fallback translation** — cards with remaining untranslated spans call `POST /api/translate` and show a second result block (**Gemini + glossary**).

## Scryfall etiquette

Card data is provided by Scryfall (not affiliated with Wizards of the Coast). Please:

- Cache responses when possible (this app uses [SWR](https://swr.vercel.app/) deduping).
- Space requests modestly; stay under ~10 requests/second as [documented](https://scryfall.com/docs/api).

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4
- SWR for autocomplete fetching

## Gemini + Glossary setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Add your Gemini key in `.env.local`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_GLOSSARY_LIMIT=80
```

3. Restart dev server.

The app prompt includes a glossary built from [`lib/translate/keywords.ts`](lib/translate/keywords.ts). You can append project-specific terms with `GEMINI_GLOSSARY_EXTRA`.

## Next steps

- Wire **keyword filter pills** to Scryfall (`keyword:flying`, etc.).
- Improve glossary quality and add phrase-level overrides by card/set.
- Render **mana symbols** with Scryfall SVG/collector data instead of raw `{W}` strings.
- Dedicated **card detail** route and tests/CI.

## License

MIT (project code). MTG card names and Oracle text are trademarks of Wizards of the Coast; data © Scryfall.
