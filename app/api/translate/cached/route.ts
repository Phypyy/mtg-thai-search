import { getCachedTranslation } from "@/lib/translate/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oracleId = searchParams.get("oracle_id");

  if (!oracleId) {
    return NextResponse.json(
      { error: "oracle_id query parameter is required." },
      { status: 400 },
    );
  }

  const translated = getCachedTranslation(oracleId);

  return NextResponse.json({ translated });
}
