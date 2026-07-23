import "server-only";
import { MADRID_FOCUS, type AddressSuggestion } from "./types";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

function apiKey(): string | null {
  const k =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    "";
  return k || null;
}

export function googlePlacesConfigured(): boolean {
  return apiKey() !== null;
}

export async function autocompleteGoogle(opts: {
  text: string;
  size?: number;
  focusLat?: number;
  focusLon?: number;
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<AddressSuggestion[]> {
  const key = apiKey();
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY no configurada");

  const lat = opts.focusLat ?? MADRID_FOCUS.lat;
  const lon = opts.focusLon ?? MADRID_FOCUS.lon;

  const res = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    signal: opts.signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: opts.text,
      languageCode: opts.languageCode ?? "es",
      includedRegionCodes: ["es"],
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lon },
          // ~80 km: Madrid + aeropuerto + alrededores.
          radius: 80000.0,
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Places autocomplete ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  const out: AddressSuggestion[] = [];
  const seen = new Set<string>();
  for (const s of data.suggestions ?? []) {
    const p = s.placePrediction;
    if (!p?.placeId || !p.text?.text) continue;
    if (seen.has(p.placeId)) continue;
    seen.add(p.placeId);
    out.push({
      id: `google:${p.placeId}`,
      label: p.text.text,
      lat: null,
      lon: null,
      placeId: p.placeId,
      provider: "google",
      locality: p.structuredFormat?.secondaryText?.text ?? null,
    });
    if (out.length >= (opts.size ?? 8)) break;
  }
  return out;
}

/** Resuelve coordenadas de un placeId de Google Places (New). */
export async function placeDetailsGoogle(opts: {
  placeId: string;
  languageCode?: string;
  signal?: AbortSignal;
}): Promise<{ label: string; lat: number; lon: number } | null> {
  const key = apiKey();
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY no configurada");

  const id = opts.placeId.replace(/^places\//, "");
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "GET",
    signal: opts.signal,
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,formattedAddress,location,displayName",
      "Accept-Language": opts.languageCode ?? "es",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Place Details ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    formattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
  };

  const lat = data.location?.latitude;
  const lon = data.location?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const label =
    data.formattedAddress?.trim() ||
    data.displayName?.text?.trim() ||
    opts.placeId;

  return { label, lat: lat!, lon: lon! };
}
