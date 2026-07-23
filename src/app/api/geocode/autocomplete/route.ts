import { NextResponse } from "next/server";
import { autocompleteAddress } from "@/lib/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [], provider: null });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const focusLat = numOrNull(searchParams.get("lat"));
  const focusLon = numOrNull(searchParams.get("lon"));
  const lang = (searchParams.get("lang") ?? "es").slice(0, 8);

  try {
    const { suggestions, provider } = await autocompleteAddress({
      text: q,
      size: 8,
      focusLat: focusLat ?? undefined,
      focusLon: focusLon ?? undefined,
      languageCode: lang,
    });
    return NextResponse.json(
      { suggestions, provider },
      { headers: { "Cache-Control": "public, max-age=20" } }
    );
  } catch (err) {
    console.error("[geocode/autocomplete]", err);
    return NextResponse.json(
      { error: "geocode_unavailable", suggestions: [], provider: null },
      { status: 502 }
    );
  }
}

function numOrNull(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
