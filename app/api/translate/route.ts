import { NextResponse } from "next/server";

/**
 * Placeholder for future LLM / DeepL translation using TRANSLATION_API_KEY.
 * Returns 501 until implemented.
 */
export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    // ignore empty body
  }

  return NextResponse.json(
    {
      error:
        "Translation API not implemented. Set TRANSLATION_API_KEY and wire OpenAI or DeepL here.",
    },
    { status: 501 },
  );
}
