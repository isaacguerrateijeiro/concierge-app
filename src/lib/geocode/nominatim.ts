import "server-only";
import { MADRID_FOCUS, type AddressSuggestion } from "./types";

// OpenStreetMap Nominatim: gratis, fuerte en POIs (aeropuertos, estaciones…).
// Uso razonable: 1 req/s, User-Agent identificable.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

export async function autocompleteNominatim(opts: {
  text: string;
  size?: number;
  focusLat?: number;
  focusLon?: number;
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<AddressSuggestion[]> {
  const lat = opts.focusLat ?? MADRID_FOCUS.lat;
  const lon = opts.focusLon ?? MADRID_FOCUS.lon;
  // viewbox alrededor de Madrid (~±0.55°) para priorizar, sin forzar bounded.
  const d = 0.55;
  const viewbox = `${lon - d},${lat + d},${lon + d},${lat - d}`;

  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("q", opts.text);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("limit", String(opts.size ?? 8));
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("accept-language", opts.languageCode ?? "es");
  url.searchParams.set("viewbox", viewbox);
  url.searchParams.set("bounded", "0");

  const res = await fetch(url.toString(), {
    signal: opts.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "ConciergeOS/1.0 (kiosk destination autocomplete; contact via app)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Nominatim ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    place_id?: number;
    osm_id?: number;
    display_name?: string;
    lat?: string;
    lon?: string;
    name?: string;
    type?: string;
  }>;

  const out: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    const label = (row.display_name ?? row.name ?? "").trim();
    const la = Number(row.lat);
    const lo = Number(row.lon);
    if (!label || !Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const id = `nominatim:${row.place_id ?? row.osm_id ?? `${la},${lo}`}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      lat: la,
      lon: lo,
      placeId: null,
      provider: "nominatim",
      locality: null,
    });
  }

  return out;
}
