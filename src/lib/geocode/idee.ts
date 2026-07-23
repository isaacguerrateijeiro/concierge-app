import "server-only";

// Geolocalizador del Sistema Cartográfico Nacional (IDEE / CNIG).
// Callejero oficial de España (Catastro, CNIG, etc.), gratuito, sin API key.
// Docs: https://ideespain.github.io/Geolocalizacion/api/autocompletar/

const IDEE_AUTOCOMPLETE = "https://geolocalizador.idee.es/v1/autocomplete";

/** Sesgo por defecto: centro de Madrid (kioskos actuales). */
export const MADRID_FOCUS = { lat: 40.416775, lon: -3.70379 };

export interface AddressSuggestion {
  id: string;
  label: string;
  name: string;
  locality: string | null;
  region: string | null;
  postalcode: string | null;
  layer: string | null;
  lat: number;
  lon: number;
}

interface IdeeFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    gid?: string;
    id?: string;
    label?: string;
    name?: string;
    locality?: string;
    localadmin?: string;
    region?: string;
    postalcode?: string;
    layer?: string;
  };
}

interface IdeeResponse {
  features?: IdeeFeature[];
}

export async function autocompleteSpain(opts: {
  text: string;
  size?: number;
  focusLat?: number;
  focusLon?: number;
  signal?: AbortSignal;
}): Promise<AddressSuggestion[]> {
  const text = opts.text.trim();
  if (text.length < 3) return [];

  const url = new URL(IDEE_AUTOCOMPLETE);
  url.searchParams.set("text", text);
  url.searchParams.set("size", String(opts.size ?? 8));
  url.searchParams.set("lang", "es");
  // Direcciones, calles y POIs (aeropuertos, estaciones…).
  url.searchParams.set("layers", "address,street,venue");
  url.searchParams.set(
    "focus.point.lat",
    String(opts.focusLat ?? MADRID_FOCUS.lat)
  );
  url.searchParams.set(
    "focus.point.lon",
    String(opts.focusLon ?? MADRID_FOCUS.lon)
  );

  const res = await fetch(url.toString(), {
    signal: opts.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "ConciergeOS/1.0 (kiosk; address autocomplete)",
    },
    // No cachear en el edge de forma agresiva: cada query es distinta.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`IDEE autocomplete ${res.status}`);
  }

  const data = (await res.json()) as IdeeResponse;
  const out: AddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lon, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const label = (p.label ?? p.name ?? "").trim();
    if (!label) continue;
    const id = p.gid ?? p.id ?? `${label}:${lat},${lon}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      name: (p.name ?? label).trim(),
      locality: p.locality ?? p.localadmin ?? null,
      region: p.region ?? null,
      postalcode: p.postalcode ?? null,
      layer: p.layer ?? null,
      lat,
      lon,
    });
  }

  return out;
}
