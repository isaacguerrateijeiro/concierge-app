import "server-only";
import * as cheerio from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { fetchHtml, slugify } from "./scraper";
import { normalizeFuenteRef, type ResultadoImportacion } from "./types";

type DbClient = SupabaseClient<Database>;

// ============================================================
// Importador específico Free Tour Madrid (Madrid a Pie).
// Sync de reemplazo bajo el grupo fijo `free-tour`:
//   - lista itinerarios únicos de madridapie.com
//   - enriquece cada PDP (JSON-LD Product)
//   - fuerza tipo_pago integrado (reserva en kiosko)
//   - despublica cualquier hoja no vista en esta pasada
// No usa el importador genérico (evita clones / "Madrid a Pie" vacíos).
// ============================================================

const ROOT_SLUG = "free-tour";
const LISTADO_DEFAULT = "https://madridapie.com";

/** Rutas de itinerario → slug/títulos curados del catálogo local. */
const CANONICOS: Record<
  string,
  { slug: string; titulo_es: string; titulo_en: string; subtitulo_es: string }
> = {
  "madrid-basico-espanol": {
    slug: "freetour-madrid-basico",
    titulo_es: "Madrid Básico",
    titulo_en: "Madrid Básico",
    subtitulo_es: "2 h · Español · Todos los días",
  },
  "madrid-basic-english": {
    slug: "freetour-madrid-basic-en",
    titulo_es: "Madrid Basic (Inglés)",
    titulo_en: "Madrid Basic (English)",
    subtitulo_es: "2 h · Inglés · Todos los días",
  },
  "madrid-de-los-borbones": {
    slug: "freetour-borbones",
    titulo_es: "Madrid de los Borbones",
    titulo_en: "Madrid of the Bourbons",
    subtitulo_es: "2 h · Español · Todos los días",
  },
  "barrio-de-las-letras": {
    slug: "freetour-barrio-letras",
    titulo_es: "Barrio de las Letras",
    titulo_en: "Literary Quarter",
    subtitulo_es: "2 h · Español · Todos los días",
  },
  "el-inquisicion-en-madrid": {
    slug: "freetour-inquisicion",
    titulo_es: "La Inquisición en Madrid",
    titulo_en: "The Inquisition in Madrid",
    subtitulo_es: "2 h · Español · Todos los días",
  },
  "el-madrid-de-los-austrias": {
    slug: "freetour-austrias",
    titulo_es: "El Madrid de los Austrias",
    titulo_en: "Madrid of the Austrias",
    subtitulo_es: "2 h · Español · Todos los días",
  },
  "mitos-y-leyendas-de-madrid": {
    slug: "freetour-mitos-leyendas",
    titulo_es: "Mitos y leyendas de Madrid",
    titulo_en: "Myths and Legends of Madrid",
    subtitulo_es: "1 h 30 · Español · Nocturno",
  },
  "madrid-siniestro": {
    slug: "freetour-madrid-siniestro",
    titulo_es: "Madrid Siniestro",
    titulo_en: "Sinister Madrid",
    subtitulo_es: "1 h 30 · Español · Todos los días",
  },
  "night-tour": {
    slug: "freetour-night-tour",
    titulo_es: "Night Tour",
    titulo_en: "Night Tour",
    subtitulo_es: "2 h · Español · Nocturno",
  },
  "madrid-hechizado": {
    slug: "freetour-madrid-hechizado",
    titulo_es: "Madrid Hechizado",
    titulo_en: "Enchanted Madrid",
    subtitulo_es: "2 h · Español · Nocturno",
  },
};

type TourScraped = {
  url: string;
  pathSlug: string;
  titulo: string;
  descripcion: string | null;
  puntoEncuentro: string | null;
  duracion: string | null;
  subtitulo: string | null;
  imagen: string | null;
};

type Existente = {
  id: string;
  slug: string;
  fuente_ref: string | null;
  estado: string;
  titulo_i18n: Record<string, string>;
  subtitulo_i18n: Record<string, string>;
  descripcion_i18n: Record<string, string>;
  punto_encuentro_i18n: Record<string, string>;
  duracion_i18n: Record<string, string>;
};

function asI18n(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) out[k] = val.trim();
  }
  return out;
}

function mergeI18n(
  prev: Record<string, string>,
  next: Record<string, string>
): Record<string, string> {
  const out = { ...prev };
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function pathSlugFromUrl(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/itinerary\/([a-z0-9-]+)\/?/i);
    return m?.[1]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function tituloLimpio(raw: string): string {
  return raw
    .replace(/\s*[-–|]\s*Free Tour Madrid\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function esTituloGenerico(titulo: string): boolean {
  const t = titulo.trim().toLowerCase();
  return !t || t === "madrid a pie" || t === "free tour madrid" || t === "free tour";
}

/** "🕙 2 Horas I 💬 Español I 🗓️ Todos los días" → "2 h · Español · Todos los días" */
function metaASubtitulo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clock = raw.match(/🕙\s*([^💬🗓️🌙I|]+)/i)?.[1]?.trim();
  const langRaw = raw.match(/💬\s*([^🕙🗓️🌙I|]+)/i)?.[1]?.trim();
  const night = /🌙\s*Nocturno/i.test(raw) || /night/i.test(raw);
  const whenRaw = raw.match(/🗓️\s*([^💬🕙🌙I|]+)/i)?.[1]?.trim();
  const parts: string[] = [];
  if (clock) {
    const d = clock
      .replace(/hours?/i, "h")
      .replace(/horas?/i, "h")
      .replace(/\s+/g, " ")
      .trim();
    parts.push(d.replace(/(\d)\s*h/i, "$1 h"));
  }
  if (langRaw) {
    const l = langRaw.toLowerCase();
    if (l.includes("english") || l.includes("ingl")) parts.push("Inglés");
    else if (l.includes("espa") || l.includes("castell")) parts.push("Español");
    else parts.push(langRaw);
  }
  if (night) parts.push("Nocturno");
  else if (whenRaw) {
    const w = whenRaw.toLowerCase();
    if (w.includes("every day") || w.includes("todos los")) parts.push("Todos los días");
    else parts.push(whenRaw);
  }
  return parts.length >= 2 ? parts.join(" · ") : null;
}

function imagenGrande(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1");
}

function esPuntoValido(raw: string): boolean {
  const t = raw.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 12) return false;
  // Evitar capturar la frase de puntualidad ("…al punto de encuentro ya que…").
  if (/^ya que\b/i.test(t)) return false;
  if (/llega\s+\d+\s+minutos/i.test(t)) return false;
  if (/empezar[áa]\s+puntualmente/i.test(t)) return false;
  return true;
}

/** Punto de encuentro tal cual en la web (tabla PDP → Empieza: → JSON-LD). */
function extraerPuntoEncuentro(
  $: cheerio.CheerioAPI,
  descRaw: string
): string | null {
  for (const el of $("td").toArray()) {
    const label = $(el).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!label.includes("punto de encuentro") && label !== "meeting point") continue;
    const val = $(el).next("td").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (esPuntoValido(val)) return val.slice(0, 400);
  }

  const empieza =
    descRaw.match(/^\s*Empieza:\s*(.+)$/im)?.[1]?.trim() ||
    descRaw.match(/^\s*Start:\s*(.+)$/im)?.[1]?.trim();
  if (empieza && esPuntoValido(empieza)) return empieza.slice(0, 400);

  // Línea siguiente a un "Punto de encuentro" / "Meeting point" aislado en el JSON-LD.
  const lines = descRaw.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i].replace(/\u00a0/g, " ").trim();
    if (!/^(punto de encuentro|meeting point)$/i.test(label)) continue;
    const next = (lines[i + 1] ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (esPuntoValido(next)) return next.slice(0, 400);
  }
  return null;
}

const TIERS_FREETOUR = [
  {
    tipo: "adulto",
    label_i18n: { es: "Adulto", en: "Adult" },
    precio: 0,
    orden: 0,
  },
  {
    tipo: "nino",
    label_i18n: { es: "Niño", en: "Child" },
    precio: 0,
    orden: 1,
  },
] as const;

/** Garantiza calendario + selectores de pasajeros (adulto/niño) en el kiosko. */
async function asegurarTiersFreeTour(
  db: DbClient,
  serviceId: string
): Promise<void> {
  const { data: existentes } = await db
    .from("service_price_tiers")
    .select("id, tipo")
    .eq("service_id", serviceId);

  const tipos = new Set((existentes ?? []).map((t) => t.tipo));
  const tieneAdultoNino = tipos.has("adulto") && tipos.has("nino");
  if (tieneAdultoNino) {
    // Asegurar precio 0 en free tours.
    await db
      .from("service_price_tiers")
      .update({ precio: 0 })
      .eq("service_id", serviceId)
      .in("tipo", ["adulto", "nino"]);
    return;
  }

  // Sustituir tiers legacy (p.ej. "persona") por adulto + niño.
  if ((existentes ?? []).length > 0) {
    await db.from("service_price_tiers").delete().eq("service_id", serviceId);
  }
  const { error } = await db.from("service_price_tiers").insert(
    TIERS_FREETOUR.map((t) => ({
      service_id: serviceId,
      tipo: t.tipo,
      label_i18n: t.label_i18n,
      precio: t.precio,
      orden: t.orden,
    }))
  );
  if (error) throw new Error(`tiers: ${error.message}`);
}

function parseProductJsonLd(html: string): {
  name?: string;
  description?: string;
  image?: string;
  price?: number;
} | null {
  const $ = cheerio.load(html);
  let best: { name?: string; description?: string; image?: string; price?: number } | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(data) ? data : [data];
      for (const n of nodes) {
        if (!n || typeof n !== "object") continue;
        const type = String((n as { "@type"?: string })["@type"] ?? "");
        if (type !== "Product" && type !== "Trip") continue;
        const name = typeof (n as { name?: string }).name === "string" ? (n as { name: string }).name : undefined;
        const description =
          typeof (n as { description?: string }).description === "string"
            ? (n as { description: string }).description
            : undefined;
        let image: string | undefined;
        const img = (n as { image?: unknown }).image;
        if (typeof img === "string") image = img;
        else if (Array.isArray(img) && typeof img[0] === "string") image = img[0];
        const offers = (n as { offers?: { price?: unknown } }).offers;
        const price = offers?.price != null ? Number(offers.price) : undefined;
        if (name || description) {
          best = { name, description, image, price: Number.isFinite(price) ? price : undefined };
        }
      }
    } catch {
      /* ignore bad json-ld */
    }
  });
  return best;
}

async function listarItinerarios(listadoUrl: string): Promise<{ urls: string[]; notas: string[] }> {
  const notas: string[] = [];
  const { status, body } = await fetchHtml(listadoUrl);
  if (status >= 400) {
    return { urls: [], notas: [`HTTP ${status} al leer ${listadoUrl}`] };
  }
  const urls = new Set<string>();
  const $ = cheerio.load(body);
  $("a[href*='/itinerary/']").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    if (!href) return;
    try {
      const u = new URL(href, listadoUrl);
      if (!/\/itinerary\/[a-z0-9-]+\/?$/i.test(u.pathname)) return;
      u.hash = "";
      u.search = "";
      // Canonicalizar con trailing slash.
      const path = u.pathname.replace(/\/+$/, "") + "/";
      urls.add(`${u.protocol}//${u.host.toLowerCase()}${path}`);
    } catch {
      /* ignore */
    }
  });
  notas.push(`Listado: ${urls.size} itinerarios únicos.`);
  return { urls: Array.from(urls).sort(), notas };
}

async function leerPdp(url: string): Promise<TourScraped | null> {
  const pathSlug = pathSlugFromUrl(url);
  if (!pathSlug) return null;
  const { status, body } = await fetchHtml(url);
  if (status >= 400) return null;

  const $ = cheerio.load(body);
  const product = parseProductJsonLd(body);
  const h1 = $("h1.entry-title").first().text().trim();
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const ogDesc = $('meta[property="og:description"]').attr("content") ?? "";
  const ogImage = $('meta[property="og:image"]').attr("content") ?? null;

  let titulo = tituloLimpio(product?.name || h1 || ogTitle);
  if (esTituloGenerico(titulo)) {
    const canon = CANONICOS[pathSlug];
    titulo = canon?.titulo_es ?? tituloLimpio(pathSlug.replace(/-/g, " "));
  }
  if (esTituloGenerico(titulo)) return null;

  const descRaw = (product?.description ?? "").replace(/\r/g, "").trim();
  // Descripción útil: bloque "Información:" o primeros párrafos sin itinerario largo.
  let descripcion: string | null = null;
  if (descRaw) {
    const info = descRaw.match(/Información:\s*([\s\S]*?)(?:\n\s*Itinerario:|$)/i);
    descripcion = (info?.[1] ?? descRaw.split("Itinerario:")[0] ?? descRaw)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 4000);
  }
  if (!descripcion) {
    const p = $("article .entry-content p, .entry-content p").first().text().trim();
    if (p.length > 40) descripcion = p.slice(0, 4000);
  }

  const metaLine =
    $("p")
      .filter((_, el) => ($(el).text() ?? "").includes("🕙"))
      .first()
      .text()
      .trim() || ogDesc;

  const subtitulo = metaASubtitulo(metaLine) ?? CANONICOS[pathSlug]?.subtitulo_es ?? null;
  const puntoEncuentro = extraerPuntoEncuentro($, descRaw);
  const duracion =
    subtitulo?.split("·")[0]?.trim() ||
    $("td")
      .filter((_, el) => ($(el).text() ?? "").toLowerCase().includes("duración") || ($(el).text() ?? "").toLowerCase().includes("duracion"))
      .next()
      .text()
      .trim() ||
    null;

  return {
    url: normalizeFuenteRef(url),
    pathSlug,
    titulo,
    descripcion,
    puntoEncuentro,
    duracion,
    subtitulo,
    imagen: imagenGrande(product?.image ?? ogImage),
  };
}

async function categoriaDestino(
  supabase: DbClient,
  tenantId: string,
  categoriaIdCfg: string | undefined
): Promise<string | null> {
  if (categoriaIdCfg) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoriaIdCfg)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (data) return data.id;
  }
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function asegurarGrupo(
  supabase: DbClient,
  ctx: {
    tenantId: string;
    providerId: string;
    categoryId: string;
    slug: string;
    titulo: string;
    subtitulo: string;
    ahora: string;
  }
): Promise<string> {
  const { data: ya } = await supabase
    .from("services")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("provider_id", ctx.providerId)
    .eq("slug", ctx.slug)
    .maybeSingle();

  if (ya) {
    await supabase
      .from("services")
      .update({
        estado: "publicado",
        activo: true,
        tipo_nodo: "grupo",
        parent_id: null,
        importado_at: ctx.ahora,
        titulo_i18n: { es: ctx.titulo, en: ctx.titulo },
        subtitulo_i18n: { es: ctx.subtitulo, en: ctx.subtitulo },
      })
      .eq("id", ya.id)
      .eq("tenant_id", ctx.tenantId);
    return ya.id;
  }

  const { data, error } = await supabase
    .from("services")
    .insert({
      tenant_id: ctx.tenantId,
      provider_id: ctx.providerId,
      category_id: ctx.categoryId,
      parent_id: null,
      slug: ctx.slug,
      titulo_i18n: { es: ctx.titulo, en: ctx.titulo },
      subtitulo_i18n: { es: ctx.subtitulo, en: ctx.subtitulo },
      tipo_nodo: "grupo",
      estado: "publicado",
      activo: true,
      importado_at: ctx.ahora,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`No se pudo crear grupo ${ctx.slug}: ${error?.message ?? "error"}`);
  }
  return data.id;
}

export async function importarFreeTour(
  tenantId: string,
  providerId: string,
  db: DbClient
): Promise<ResultadoImportacion> {
  const notas: string[] = [];
  const ahora = new Date().toISOString();

  const { data: prov } = await db
    .from("providers")
    .select("id, fuente_url, fuente_config")
    .eq("id", providerId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!prov) throw new Error("Proveedor Free Tour no encontrado.");

  const cfg = (prov.fuente_config ?? {}) as Record<string, unknown>;
  const listadoUrl =
    (typeof prov.fuente_url === "string" && prov.fuente_url.trim()) || LISTADO_DEFAULT;
  const categoryId = await categoriaDestino(
    db,
    tenantId,
    typeof cfg.categoria_id === "string" ? cfg.categoria_id : undefined
  );
  if (!categoryId) {
    throw new Error("No hay categoría destino para Free Tour Madrid.");
  }

  const rootId = await asegurarGrupo(db, {
    tenantId,
    providerId,
    categoryId,
    slug: ROOT_SLUG,
    titulo: "Free Tour Madrid",
    subtitulo: "Free tours a pie por el centro · guías locales",
    ahora,
  });
  notas.push(`Grupo ${ROOT_SLUG} OK.`);

  const { urls, notas: notasListado } = await listarItinerarios(listadoUrl);
  notas.push(...notasListado);

  const tours: TourScraped[] = [];
  for (const url of urls) {
    try {
      const t = await leerPdp(url);
      if (!t) {
        notas.push(`PDP omitida: ${url}`);
        continue;
      }
      // Si la web sirve contenido cruzado (mismo título en otra ruta),
      // preferimos el canónico por path cuando el título no cuadra.
      const canon = CANONICOS[t.pathSlug];
      if (canon) {
        t.titulo = canon.titulo_es;
        if (!t.subtitulo) t.subtitulo = canon.subtitulo_es;
      }
      tours.push(t);
    } catch (e) {
      notas.push(`PDP error ${url}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // Deduplicar por path (y por título canónico si dos URLs dan lo mismo).
  const porPath = new Map<string, TourScraped>();
  for (const t of tours) {
    if (!porPath.has(t.pathSlug)) porPath.set(t.pathSlug, t);
  }
  const items = Array.from(porPath.values());
  const detectados = items.length;
  notas.push(`PDPs válidas: ${detectados}.`);

  const { data: existentesRaw } = await db
    .from("services")
    .select(
      "id, slug, fuente_ref, estado, titulo_i18n, subtitulo_i18n, descripcion_i18n, punto_encuentro_i18n, duracion_i18n"
    )
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .eq("tipo_nodo", "servicio");

  const porRef = new Map<string, Existente>();
  const porSlug = new Map<string, Existente>();
  const porTitulo = new Map<string, Existente>();
  const slugsUsados = new Set<string>([ROOT_SLUG]);

  for (const e of existentesRaw ?? []) {
    const row: Existente = {
      id: e.id,
      slug: e.slug,
      fuente_ref: e.fuente_ref,
      estado: e.estado,
      titulo_i18n: asI18n(e.titulo_i18n),
      subtitulo_i18n: asI18n(e.subtitulo_i18n),
      descripcion_i18n: asI18n(e.descripcion_i18n),
      punto_encuentro_i18n: asI18n(e.punto_encuentro_i18n),
      duracion_i18n: asI18n(e.duracion_i18n),
    };
    slugsUsados.add(e.slug);
    porSlug.set(e.slug, row);
    const titulo = (row.titulo_i18n.es ?? "").trim().toLowerCase();
    if (titulo && !esTituloGenerico(titulo)) {
      const prev = porTitulo.get(titulo);
      if (!prev || (e.slug.startsWith("freetour-") && !prev.slug.startsWith("freetour-"))) {
        porTitulo.set(titulo, row);
      }
    }
    if (e.fuente_ref && !e.fuente_ref.includes("#")) {
      porRef.set(normalizeFuenteRef(e.fuente_ref), row);
    }
  }

  const idsVistos = new Set<string>();
  let creados = 0;
  let actualizados = 0;
  let despublicados = 0;
  let errores = 0;

  for (const item of items) {
    try {
      const canon = CANONICOS[item.pathSlug];
      const slugPreferido = canon?.slug ?? `freetour-${item.pathSlug}`;
      // Preferir siempre el canónico freetour-*; los clones del scrape genérico
      // suelen tener ya la URL de itinerario y no deben "ganar" el match.
      const existe =
        porSlug.get(slugPreferido) ??
        porRef.get(item.url) ??
        porSlug.get(item.pathSlug) ??
        porTitulo.get(item.titulo.trim().toLowerCase()) ??
        null;

      const tituloEs = canon?.titulo_es ?? item.titulo;
      const tituloEn = canon?.titulo_en ?? item.titulo;
      const subEs = item.subtitulo ?? canon?.subtitulo_es ?? "";
      const descI18n: Record<string, string> = item.descripcion
        ? { es: item.descripcion }
        : {};
      // Sustituir punto de encuentro con el texto de la web (no mezclar basura previa).
      const puntoI18n: Record<string, string> = item.puntoEncuentro
        ? { es: item.puntoEncuentro }
        : {};
      const durI18n: Record<string, string> = item.duracion ? { es: item.duracion } : {};
      const subI18n: Record<string, string> = subEs ? { es: subEs } : {};

      let serviceId: string;
      if (existe) {
        // Conservar slug canónico freetour-*; no renombrar si chocaría.
        const slugUpdate =
          !existe.slug.startsWith("freetour-") && !slugsUsados.has(slugPreferido)
            ? slugPreferido
            : undefined;
        const { error } = await db
          .from("services")
          .update({
            ...(slugUpdate ? { slug: slugUpdate } : {}),
            titulo_i18n: mergeI18n(existe.titulo_i18n, { es: tituloEs, en: tituloEn }),
            subtitulo_i18n: mergeI18n(existe.subtitulo_i18n, subI18n),
            descripcion_i18n: mergeI18n(existe.descripcion_i18n, descI18n),
            ...(Object.keys(puntoI18n).length
              ? { punto_encuentro_i18n: puntoI18n }
              : {}),
            duracion_i18n: mergeI18n(existe.duracion_i18n, durI18n),
            precio_desde: 0,
            moneda: "EUR",
            imagen_url: item.imagen,
            url_redireccion: null,
            parent_id: rootId,
            tipo_pago: "integrado",
            tipo_nodo: "servicio",
            estado: "publicado",
            activo: true,
            importado_at: ahora,
            fuente_ref: item.url,
            capacidad_diaria: 30,
          })
          .eq("id", existe.id)
          .eq("tenant_id", tenantId);
        if (error) throw new Error(error.message);
        serviceId = existe.id;
        idsVistos.add(existe.id);
        actualizados += 1;
        if (slugUpdate) slugsUsados.add(slugUpdate);
      } else {
        let slug = slugPreferido;
        let i = 2;
        while (slugsUsados.has(slug)) slug = `${slugPreferido}-${i++}`;
        slugsUsados.add(slug);

        const { data, error } = await db
          .from("services")
          .insert({
            tenant_id: tenantId,
            provider_id: providerId,
            category_id: categoryId,
            parent_id: rootId,
            slug,
            titulo_i18n: { es: tituloEs, en: tituloEn },
            subtitulo_i18n: subEs ? { es: subEs } : {},
            descripcion_i18n: descI18n,
            punto_encuentro_i18n: puntoI18n,
            duracion_i18n: durI18n,
            instrucciones_i18n: {},
            tipo_nodo: "servicio",
            tipo_pago: "integrado",
            estado: "publicado",
            activo: true,
            precio_desde: 0,
            moneda: "EUR",
            imagen_url: item.imagen,
            url_redireccion: null,
            fuente_ref: item.url,
            importado_at: ahora,
            capacidad_diaria: 30,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "no creado");
        serviceId = data.id;
        idsVistos.add(data.id);
        creados += 1;
      }

      await asegurarTiersFreeTour(db, serviceId);
    } catch (e) {
      errores += 1;
      notas.push(`"${item.titulo}": ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // Sync de reemplazo: hojas no vistas → despublicado.
  if (detectados > 0) {
    for (const e of existentesRaw ?? []) {
      if (idsVistos.has(e.id)) continue;
      if (e.estado === "despublicado") continue;
      const { error } = await db
        .from("services")
        .update({ estado: "despublicado", activo: false, importado_at: ahora })
        .eq("id", e.id)
        .eq("tenant_id", tenantId);
      if (error) {
        errores += 1;
        notas.push(`Despublicar ${e.slug}: ${error.message}`);
      } else {
        despublicados += 1;
      }
    }
    notas.push(
      `Sync reemplazo: ${actualizados} act. · ${creados} creados · ${despublicados} despublicados.`
    );
  } else {
    notas.push("Sin itinerarios: no se despublica nada.");
  }

  const estado: ResultadoImportacion["estado"] =
    detectados === 0 && errores === 0
      ? "error"
      : errores > 0
        ? "parcial"
        : "ok";

  await db.from("import_runs").insert({
    tenant_id: tenantId,
    provider_id: providerId,
    fuente_url: listadoUrl,
    estado: detectados === 0 ? "error" : estado,
    detectados,
    creados,
    actualizados,
    errores,
    detalle: {
      importador: "freetour",
      metodo: "freetour",
      notas,
      despublicados,
    } as unknown as Json,
  });

  return {
    estado: detectados === 0 ? "error" : estado,
    detectados,
    creados,
    actualizados,
    despublicados,
    errores,
    metodo: "freetour",
    notas,
  };
}
