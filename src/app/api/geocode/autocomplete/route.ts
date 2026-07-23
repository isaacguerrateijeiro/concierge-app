import { NextResponse } from "next/server";
import { autocompleteSpain } from "@/lib/geocode/idee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] as const });
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "query too long" }, { status: 400 });
  }

  const focusLat = numOrNull(searchParams.get("lat"));
  const focusLon = numOrNull(searchParams.get("lon"));

  try {
    const suggestions = await autocompleteSpain({
      text: q,
      size: 8,
      focusLat: focusLat ?? undefined,
      focusLon: focusLon ?? undefined,
    });
    return NextResponse.json(
      { suggestions },
      {
        headers: {
          // Debounce en cliente; caché corta por si se repite la misma query.
          "Cache-Control": "public, max-age=30",
        },
      }
    );
  } catch (err) {
    console.error("[geocode/autocomplete]", err);
    return NextResponse.json(
      { error: "geocode_unavailable", suggestions: [] },
      { status: 502 }
    );
  }
}

function numOrNull(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
