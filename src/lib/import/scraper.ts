import "server-only";
import * as https from "https";
import * as http from "http";
import * as cheerio from "cheerio";

// ============================================================
// Scraper genérico de catálogos de proveedor. Dos estrategias, en orden:
//   1) JSON-LD (schema.org Product/Offer/ItemList): lo usan muchas webs de
//      tours y comercios; es estructurado y robusto.
//   2) Selectores CSS configurables por proveedor (fuente_config): cuando no
//      hay datos estructurados, el operador define qué nodos leer.
// No ejecuta JavaScript: lee el HTML servido. Para SPAs sin SSR conviene
// apuntar fuente_url a un endpoint/listado con HTML real o datos estructurados.
// ============================================================

export interface ScrapedTier {
  tipo: string; // clave: 'adulto', 'nino', 'senior'…
  label: string; // etiqueta en el idioma de la página
  precio: number;
}

export interface ScrapedItem {
  ref: string; // identificador estable en origen (normalmente la URL del item)
  titulo: string;
  descripcion?: string | null;
  punto_encuentro?: string | null; // lugar de salida (free tours / actividades a pie)
  duracion?: string | null; // etiqueta de duración (ej. "Medio día", "1 Día")
  precio?: number | null;
  moneda?: string | null;
  imagen?: string | null;
  url?: string | null; // página del item en el proveedor (para "derivado")
  grupo?: string | null; // etiqueta de agrupación, si la fuente la expone
  tiers?: ScrapedTier[] | null; // tarifas por tipo de pasajero, si la fuente las expone
}

export interface ScrapeResult {
  items: ScrapedItem[];
  metodo: "json-ld" | "selectores" | "ninguno";
  notas: string[];
}

export interface TierConfig {
  tipo: string; // clave a asignar: 'adulto', 'nino', 'senior'…
  label_es?: string; // etiqueta ES de respaldo si la web no la da
  label_en?: string; // etiqueta EN de respaldo
  selector: string; // selector CSS del elemento de precio para este tipo
}

export interface FuenteConfig {
  // Selectores CSS para la estrategia 2 (todos opcionales).
  item?: string; // selector de cada tarjeta/producto
  titulo?: string;
  descripcion?: string; // texto/tagline de la tarjeta
  punto_encuentro?: string; // selector del punto de encuentro / lugar de salida
  duracion?: string; // etiqueta de duración de la tarjeta
  precio?: string;
  imagen?: string; // se lee src/data-src/href
  enlace?: string; // se lee href
  grupo?: string; // etiqueta de agrupación dentro de la tarjeta
  // Solo importar tarjetas gratuitas (precio 0 o ausente). Útil para free tours.
  solo_gratuitos?: boolean;
  // Categoría destino (id) para los items importados de esta fuente.
  categoria_id?: string;
  // Tarifas por tipo de pasajero: array de configuraciones de tier
  tiers_config?: TierConfig[];
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

// Convierte "34,00 €" / "€34.00" / "from 69 EUR" a número (o null).
function parsePrecio(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const txt = String(raw);
  const m = txt.replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function absolutizar(base: string, href: string | undefined | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

// ---------- Estrategia 1: JSON-LD ----------
function leerJsonLd(html: string, base: string): ScrapedItem[] {
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    // Aplana @graph y arrays.
    const cola: unknown[] = Array.isArray(data) ? [...data] : [data];
    while (cola.length) {
      const node = cola.shift();
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj["@graph"])) cola.push(...(obj["@graph"] as unknown[]));

      const tipo = obj["@type"];
      const tipos = Array.isArray(tipo) ? tipo.map(String) : [String(tipo ?? "")];

      // ItemList → recorrer sus elementos.
      if (tipos.includes("ItemList") && Array.isArray(obj.itemListElement)) {
        for (const li of obj.itemListElement as unknown[]) {
          if (li && typeof li === "object") {
            const liObj = li as Record<string, unknown>;
            cola.push(liObj.item ?? liObj);
          }
        }
        continue;
      }

      if (tipos.includes("Product") || tipos.includes("Offer") || tipos.includes("TouristTrip") || tipos.includes("Trip")) {
        const offers = (Array.isArray(obj.offers) ? obj.offers[0] : obj.offers) as
          | Record<string, unknown>
          | undefined;
        const url = absolutizar(base, (obj.url as string) ?? (offers?.url as string));
        const imagenRaw = Array.isArray(obj.image) ? obj.image[0] : obj.image;
        const titulo = String(obj.name ?? "").trim();
        if (!titulo) continue;
        items.push({
          ref: url ?? `${base}#${slugify(titulo)}`,
          titulo,
          descripcion: obj.description ? String(obj.description) : null,
          precio: parsePrecio(offers?.price ?? offers?.lowPrice ?? obj.price),
          moneda: (offers?.priceCurrency as string) ?? null,
          imagen: absolutizar(base, imagenRaw ? String(imagenRaw) : null),
          url,
          grupo: obj.category ? String(obj.category) : null,
        });
      }
    }
  });

  return dedupe(items);
}

// ---------- Estrategia 2: selectores CSS ----------
function leerSelectores(html: string, base: string, cfg: FuenteConfig): ScrapedItem[] {
  if (!cfg.item) return [];
  const $ = cheerio.load(html);
  const items: ScrapedItem[] = [];

  $(cfg.item).each((_, el) => {
    const $el = $(el);
    const titulo = cfg.titulo ? $el.find(cfg.titulo).first().text().trim() : $el.text().trim();
    if (!titulo) return;
    const precio = cfg.precio ? parsePrecio($el.find(cfg.precio).first().text()) : null;
    // Enlace: selector explícito, o el propio elemento si es un <a> (listas de
    // enlaces), o el primer <a> descendiente.
    const enlaceEl = cfg.enlace
      ? $el.find(cfg.enlace).first()
      : $el.is("a")
        ? $el
        : $el.find("a").first();
    const url = absolutizar(base, enlaceEl.attr("href"));
    let imagen: string | null = null;
    if (cfg.imagen) {
      const img = $el.find(cfg.imagen).first();
      imagen = absolutizar(base, img.attr("src") ?? img.attr("data-src") ?? img.attr("href"));
    }
    const descripcion = cfg.descripcion ? $el.find(cfg.descripcion).first().text().trim() || null : null;
    const puntoEncuentro = cfg.punto_encuentro ? $el.find(cfg.punto_encuentro).first().text().trim() || null : null;
    const duracion = cfg.duracion ? $el.find(cfg.duracion).first().text().trim() || null : null;
    const grupo = cfg.grupo ? $el.find(cfg.grupo).first().text().trim() || null : null;

    // Filtro de solo gratuitos: descartar tarjetas con precio > 0.
    if (cfg.solo_gratuitos && precio !== null && precio > 0) return;

    // Tarifas por tipo de pasajero (si están configuradas)
    let tiers: ScrapedTier[] | null = null;
    if (cfg.tiers_config && cfg.tiers_config.length > 0) {
      const tiersExtraidos: ScrapedTier[] = [];
      for (const tc of cfg.tiers_config) {
        const rawPrecio = $el.find(tc.selector).first().text();
        const precio = parsePrecio(rawPrecio);
        if (precio !== null) {
          tiersExtraidos.push({
            tipo: tc.tipo,
            label: tc.label_es ?? tc.tipo,
            precio,
          });
        }
      }
      if (tiersExtraidos.length > 0) tiers = tiersExtraidos;
    }

    items.push({
      ref: url ?? `${base}#${slugify(titulo)}`,
      titulo,
      descripcion,
      punto_encuentro: puntoEncuentro,
      duracion,
      precio,
      imagen,
      url,
      grupo,
      tiers,
    });
  });

  return dedupe(items);
}

function dedupe(items: ScrapedItem[]): ScrapedItem[] {
  const vistos = new Set<string>();
  const out: ScrapedItem[] = [];
  for (const it of items) {
    if (vistos.has(it.ref)) continue;
    vistos.add(it.ref);
    out.push(it);
  }
  return out;
}

// Descarga HTML con redirección manual usando el módulo nativo de Node.
// `fetch`/undici tiene un límite de headers (UND_ERR_HEADERS_OVERFLOW) que
// algunos CDN anti-bot superan; los módulos http/https nativos no tienen esa restricción.
function fetchHtml(url: string, maxRedirects = 5): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const attemptUrl = (current: string, redirectsLeft: number) => {
      const parsed = new URL(current);
      const mod = parsed.protocol === "https:" ? https : http;
      const req = mod.get(
        current,
        {
          headers: {
            "User-Agent": UA,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "es-ES,es;q=0.9",
          },
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            if (redirectsLeft <= 0) {
              reject(new Error("Demasiadas redirecciones"));
              return;
            }
            const next = new URL(res.headers.location, current).toString();
            res.resume();
            attemptUrl(next, redirectsLeft - 1);
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      req.setTimeout(20_000, () => { req.destroy(); reject(new Error("Timeout descargando fuente")); });
    };
    attemptUrl(url, maxRedirects);
  });
}

export async function scrapeFuente(
  url: string,
  cfg: FuenteConfig = {}
): Promise<ScrapeResult> {
  const notas: string[] = [];
  let html: string;
  try {
    const { status, body } = await fetchHtml(url);
    if (status >= 400) {
      return { items: [], metodo: "ninguno", notas: [`HTTP ${status} al leer la fuente.`] };
    }
    html = body;
  } catch (e) {
    return {
      items: [],
      metodo: "ninguno",
      notas: [`No se pudo descargar la fuente: ${e instanceof Error ? e.message : "error"}`],
    };
  }

  const porJsonLd = leerJsonLd(html, url);
  if (porJsonLd.length > 0) {
    notas.push(`JSON-LD: ${porJsonLd.length} elementos.`);
    return { items: porJsonLd, metodo: "json-ld", notas };
  }
  notas.push("Sin datos JSON-LD utilizables.");

  const porSelectores = leerSelectores(html, url, cfg);
  if (porSelectores.length > 0) {
    notas.push(`Selectores: ${porSelectores.length} elementos.`);
    return { items: porSelectores, metodo: "selectores", notas };
  }
  notas.push(
    cfg.item
      ? "Los selectores no encontraron elementos."
      : "No hay selectores configurados (fuente_config.item)."
  );

  return { items: [], metodo: "ninguno", notas };
}
