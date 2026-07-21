// Identidad del kiosko físico (fila de `locations`).
// Prioridad: ?kiosk=<uuid> en la URL → localStorage → NEXT_PUBLIC_KIOSK_LOCATION_ID.
// Cada dispositivo de una localización distinta se configura una vez con su
// URL (p.ej. https://…/?kiosk=<id>) y queda fijado en el navegador del tótem.

const STORAGE_KEY = "conciergeos.kiosk_location_id";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esUuid(v: string | null | undefined): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Lee y, si viene por URL, persiste el id del kiosko. Solo cliente.
export function resolverLocationId(): string | null {
  if (typeof window === "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_KIOSK_LOCATION_ID;
    return esUuid(fromEnv) ? fromEnv : null;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("kiosk");
    if (esUuid(fromUrl)) {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch {
    // URL malformada: seguimos con el resto de fuentes.
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (esUuid(stored)) return stored;
  } catch {
    // localStorage bloqueado (modo privado estricto): seguimos.
  }

  const fromEnv = process.env.NEXT_PUBLIC_KIOSK_LOCATION_ID;
  return esUuid(fromEnv) ? fromEnv : null;
}

// Localiza la location del catálogo por id; si no hay id o no coincide,
// cae a la primera del catálogo (comportamiento previo).
export function localizarKiosko<T extends { id: string; nombre: string }>(
  locations: T[],
  locationId: string | null
): T | null {
  if (locationId) {
    const match = locations.find((l) => l.id === locationId);
    if (match) return match;
  }
  return locations[0] ?? null;
}
