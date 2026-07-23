import { NextResponse } from "next/server";
import { placeDetailsGoogle } from "@/lib/geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resuelve lat/lon de un placeId de Google Places al seleccionar una sugerencia. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const placeId = (searchParams.get("placeId") ?? "").trim();
  if (!placeId || placeId.length > 256) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  try {
    const place = await placeDetailsGoogle({
      placeId,
      languageCode: (searchParams.get("lang") ?? "es").slice(0, 8),
    });
    if (!place) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(place);
  } catch (err) {
    console.error("[geocode/details]", err);
    return NextResponse.json({ error: "details_unavailable" }, { status: 502 });
  }
}
