import "server-only";
import * as https from "https";
import * as http from "http";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { slugify } from "./scraper";
import { normalizeFuenteRef, type ResultadoImportacion } from "./types";

type DbClient = SupabaseClient<Database>;

// ============================================================
// Importador específico Julià Travel Madrid — sync de reemplazo.
// Fuente: AJAX Ventrata del listado Madrid (35 productos).
// Reserva integrada en kiosko (calendario + tipologías + cupo local).
// ============================================================

const ROOT_SLUG = "julia-madrid";
const LISTADO_DEFAULT = "https://juliatravel.com/destinos/madrid/";
const AJAX_URL = "https://juliatravel.com/wp-admin/admin-ajax.php";
const PRODUCT_BASE = "https://juliatravel.com/productos/";
const CUPO_DEFAULT = 20;

type JuliaUnit = { internalName?: string; id?: string };
type JuliaOption = { internalName?: string; title?: string; units?: JuliaUnit[] };
type JuliaProduct = {
  reference?: string;
  title?: string;
  internalName?: string;
  shortDescription?: string;
  description?: string;
  longNameSlug?: string;
  price?: number | null;
  prices?: { retail?: number; original?: number; currency?: string } | null;
  duration?: string | null;
  durations?: unknown;
  meetingPoint?: string | null;
  coverImageUrl?: string | string[] | null;
  image?: string | string[] | null;
  options?: JuliaOption[] | null;
  usageInstructions?: string | null;
  redemptionInstructions?: string | null;
};

type TierDraft = {
  tipo: string;
  label_i18n: Record<string, string>;
  precio: number;
  orden: number;
};

type Existente = {
  id: string;
  slug: string;
  fuente_ref: string | null;
  estado: string;
};

function firstImage(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string" && x.trim()) return x.trim();
    }
  }
  return null;
}

function duracionLabel(p: JuliaProduct): string | null {
  if (typeof p.duration === "string" && p.duration.trim()) return p.duration.trim();
  if (Array.isArray(p.durations) && p.durations.length) {
    const d = p.durations[0];
    if (typeof d === "string") return d;
    if (d && typeof d === "object" && "duration" in d) {
      const v = (d as { duration?: unknown }).duration;
      if (typeof v === "string") return v;
      if (typeof v === "number") return `${v} horas`;
    }
  }
  return null;
}

function mapUnitTipo(name: string): {
  tipo: string;
  label_es: string;
  label_en: string;
} | null {
  const n = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (n.includes("famil") || n.includes("family")) return null;
  if (n.includes("adult")) return { tipo: "adulto", label_es: "Adulto", label_en: "Adult" };
  if (n.includes("nin") || n.includes("child") || n.includes("kids"))
    return { tipo: "nino", label_es: "Niño", label_en: "Child" };
  if (n.includes("senior") || n.includes("jubil"))
    return { tipo: "senior", label_es: "Senior", label_en: "Senior" };
  if (n.includes("beb") || n.includes("infant") || n.includes("baby"))
    return { tipo: "bebe", label_es: "Bebé", label_en: "Infant" };
  return null;
}

function tiersDesdeProducto(p: JuliaProduct, precioBase: number): TierDraft[] {
  const porTipo = new Map<string, TierDraft>();
  for (const opt of p.options ?? []) {
    for (const u of opt.units ?? []) {
      const nombre = (u.internalName ?? "").trim();
      if (!nombre) continue;
      const mapped = mapUnitTipo(nombre);
      if (!mapped || porTipo.has(mapped.tipo)) continue;
      const precio =
        mapped.tipo === "bebe" ? 0 : mapped.tipo === "nino" ? Math.round(precioBase * 0.75 * 100) / 100 : precioBase;
      porTipo.set(mapped.tipo, {
        tipo: mapped.tipo,
        label_i18n: { es: mapped.label_es, en: mapped.label_en },
        precio,
        orden: mapped.tipo === "adulto" ? 0 : mapped.tipo === "nino" ? 1 : mapped.tipo === "senior" ? 2 : 3,
      });
    }
  }
  if (!porTipo.has("adulto")) {
    porTipo.set("adulto", {
      tipo: "adulto",
      label_i18n: { es: "Adulto", en: "Adult" },
      precio: precioBase,
      orden: 0,
    });
  }
  if (!porTipo.has("nino")) {
    porTipo.set("nino", {
      tipo: "nino",
      label_i18n: { es: "Niño", en: "Child" },
      precio: Math.round(precioBase * 0.75 * 100) / 100,
      orden: 1,
    });
  }
  return Array.from(porTipo.values()).sort((a, b) => a.orden - b.orden);
}

function postForm(
  url: string,
  fields: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(fields).toString();
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
          "X-Requested-With": "XMLHttpRequest",
          Referer: LISTADO_DEFAULT,
          Accept: "application/json, text/javascript, */*; q=0.01",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy();
      reject(new Error("Timeout AJAX Julià Travel"));
    });
    req.write(body);
    req.end();
  });
}

async function listarProductosMadrid(): Promise<{
  products: JuliaProduct[];
  notas: string[];
}> {
  const notas: string[] = [];
  const { status, body } = await postForm(AJAX_URL, {
    action: "jtwwb2c_ventrata_get_all_products",
    locale: "es_ES",
    "filters[page]": "1",
    "filters[limit]": "50",
    "filters[locale]": "es",
    "filters[categories]": "Madrid",
    "filters[from]": "0",
    "filters[to]": "100",
  });
  if (status >= 400) {
    return { products: [], notas: [`AJAX HTTP ${status}`] };
  }
  let parsed: { results?: JuliaProduct[]; count?: number };
  try {
    parsed = JSON.parse(body) as { results?: JuliaProduct[]; count?: number };
  } catch {
    return { products: [], notas: ["AJAX: respuesta no JSON."] };
  }
  const products = Array.isArray(parsed.results) ? parsed.results : [];
  notas.push(`AJAX Madrid: ${products.length}/${parsed.count ?? "?"} productos.`);
  return { products, notas };
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

async function asegurarTiers(
  db: DbClient,
  serviceId: string,
  tiers: TierDraft[]
): Promise<void> {
  const { data: existentes } = await db
    .from("service_price_tiers")
    .select("id, tipo")
    .eq("service_id", serviceId);
  const porTipo = new Map((existentes ?? []).map((t) => [t.tipo, t.id]));

  for (const tier of tiers) {
    const ya = porTipo.get(tier.tipo);
    if (ya) {
      await db
        .from("service_price_tiers")
        .update({
          label_i18n: tier.label_i18n,
          precio: tier.precio,
          orden: tier.orden,
          activo: true,
        })
        .eq("id", ya);
      porTipo.delete(tier.tipo);
    } else {
      await db.from("service_price_tiers").insert({
        service_id: serviceId,
        tipo: tier.tipo,
        label_i18n: tier.label_i18n,
        precio: tier.precio,
        orden: tier.orden,
        activo: true,
      });
    }
  }
  // Quitar tipologías obsoletas del scrape anterior.
  for (const id of porTipo.values()) {
    await db.from("service_price_tiers").delete().eq("id", id);
  }
}

export async function importarJuliaTravel(
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
  if (!prov) throw new Error("Proveedor Julià Travel no encontrado.");

  const cfg = (prov.fuente_config ?? {}) as Record<string, unknown>;
  const categoryId = await categoriaDestino(
    db,
    tenantId,
    typeof cfg.categoria_id === "string" ? cfg.categoria_id : undefined
  );
  if (!categoryId) throw new Error("No hay categoría destino para Julià Travel.");

  const rootId = await asegurarGrupo(db, {
    tenantId,
    providerId,
    categoryId,
    slug: ROOT_SLUG,
    titulo: "Julià Travel Madrid",
    subtitulo: "Excursiones, visitas guiadas y tours",
    ahora,
  });
  notas.push(`Grupo ${ROOT_SLUG} OK.`);

  const { products, notas: notasListado } = await listarProductosMadrid();
  notas.push(...notasListado);

  // Deduplicar por reference.
  const porRef = new Map<string, JuliaProduct>();
  for (const p of products) {
    const ref = (p.reference ?? "").trim().toUpperCase();
    if (!ref || !p.title) continue;
    if (!porRef.has(ref)) porRef.set(ref, p);
  }
  const items = Array.from(porRef.values());
  const detectados = items.length;

  const { data: existentesRaw } = await db
    .from("services")
    .select("id, slug, fuente_ref, estado, titulo_i18n")
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .eq("tipo_nodo", "servicio");

  const porFuente = new Map<string, Existente>();
  const porSlug = new Map<string, Existente>();
  const slugsUsados = new Set<string>([ROOT_SLUG]);

  for (const e of existentesRaw ?? []) {
    const row: Existente = {
      id: e.id,
      slug: e.slug,
      fuente_ref: e.fuente_ref,
      estado: e.estado,
    };
    slugsUsados.add(e.slug);
    porSlug.set(e.slug, row);
    if (e.fuente_ref) porFuente.set(normalizeFuenteRef(e.fuente_ref), row);
  }

  const idsVistos = new Set<string>();
  let creados = 0;
  let actualizados = 0;
  let despublicados = 0;
  let errores = 0;

  for (const p of items) {
    try {
      const ref = (p.reference ?? "").trim().toUpperCase();
      const slugBase = `julia-${ref.toLowerCase()}`;
      const pathSlug = (p.longNameSlug ?? slugify(p.title ?? ref)).replace(/^\/+|\/+$/g, "");
      const productoUrl = normalizeFuenteRef(`${PRODUCT_BASE}${pathSlug}/`);
      const precio =
        typeof p.prices?.retail === "number"
          ? p.prices.retail
          : typeof p.price === "number"
            ? p.price
            : 0;
      const moneda = p.prices?.currency || "EUR";
      const titulo = (p.title ?? p.internalName ?? ref).trim();
      const desc =
        (p.description ?? p.shortDescription ?? "").replace(/\r/g, "").trim().slice(0, 8000) || null;
      const sub = (p.shortDescription ?? "").trim().slice(0, 240);
      const duracion = duracionLabel(p);
      const punto = (p.meetingPoint ?? "").trim() || null;
      const imagen = firstImage(p.coverImageUrl) ?? firstImage(p.image);
      const instrucciones =
        [p.usageInstructions, p.redemptionInstructions]
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .join("\n\n")
          .trim() || null;

      const existe = porFuente.get(productoUrl) ?? porSlug.get(slugBase) ?? null;
      const tiers = tiersDesdeProducto(p, precio);

      let serviceId: string;
      if (existe) {
        const { error } = await db
          .from("services")
          .update({
            titulo_i18n: { es: titulo },
            subtitulo_i18n: sub ? { es: sub } : {},
            descripcion_i18n: desc ? { es: desc } : {},
            punto_encuentro_i18n: punto ? { es: punto } : {},
            instrucciones_i18n: instrucciones ? { es: instrucciones } : {},
            duracion_i18n: duracion ? { es: duracion } : {},
            precio_desde: precio,
            moneda,
            imagen_url: imagen,
            url_redireccion: null,
            parent_id: rootId,
            category_id: categoryId,
            tipo_pago: "integrado",
            tipo_nodo: "servicio",
            estado: "publicado",
            activo: true,
            importado_at: ahora,
            fuente_ref: productoUrl,
            capacidad_diaria: CUPO_DEFAULT,
          })
          .eq("id", existe.id)
          .eq("tenant_id", tenantId);
        if (error) throw new Error(error.message);
        serviceId = existe.id;
        actualizados += 1;
      } else {
        let slug = slugBase;
        let i = 2;
        while (slugsUsados.has(slug)) slug = `${slugBase}-${i++}`;
        slugsUsados.add(slug);
        const { data, error } = await db
          .from("services")
          .insert({
            tenant_id: tenantId,
            provider_id: providerId,
            category_id: categoryId,
            parent_id: rootId,
            slug,
            titulo_i18n: { es: titulo },
            subtitulo_i18n: sub ? { es: sub } : {},
            descripcion_i18n: desc ? { es: desc } : {},
            punto_encuentro_i18n: punto ? { es: punto } : {},
            instrucciones_i18n: instrucciones ? { es: instrucciones } : {},
            duracion_i18n: duracion ? { es: duracion } : {},
            tipo_nodo: "servicio",
            tipo_pago: "integrado",
            estado: "publicado",
            activo: true,
            precio_desde: precio,
            moneda,
            imagen_url: imagen,
            url_redireccion: null,
            fuente_ref: productoUrl,
            importado_at: ahora,
            capacidad_diaria: CUPO_DEFAULT,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "no creado");
        serviceId = data.id;
        creados += 1;
      }

      await asegurarTiers(db, serviceId, tiers);
      idsVistos.add(serviceId);
    } catch (e) {
      errores += 1;
      notas.push(
        `"${p.title ?? p.reference}": ${e instanceof Error ? e.message : "error"}`
      );
    }
  }

  if (detectados > 0) {
    for (const e of existentesRaw ?? []) {
      if (idsVistos.has(e.id)) continue;
      // Borrar seeds antiguos / hojas no vistas (sync-replace fuerte).
      const { error } = await db
        .from("services")
        .delete()
        .eq("id", e.id)
        .eq("tenant_id", tenantId);
      if (error) {
        // Fallback despublicar si hay FK (pedidos).
        const { error: e2 } = await db
          .from("services")
          .update({ estado: "despublicado", activo: false, importado_at: ahora })
          .eq("id", e.id)
          .eq("tenant_id", tenantId);
        if (e2) {
          errores += 1;
          notas.push(`Limpiar ${e.slug}: ${error.message}`);
        } else {
          despublicados += 1;
          notas.push(`Despublicado (no borrable) ${e.slug}.`);
        }
      } else {
        despublicados += 1;
      }
    }
    notas.push(
      `Sync reemplazo: ${actualizados} act. · ${creados} creados · ${despublicados} eliminados/despub.`
    );
  } else {
    notas.push("Sin productos: no se limpia el catálogo.");
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
    fuente_url: prov.fuente_url ?? LISTADO_DEFAULT,
    estado: detectados === 0 ? "error" : estado,
    detectados,
    creados,
    actualizados,
    errores,
    detalle: {
      importador: "julia",
      metodo: "julia",
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
    metodo: "julia",
    notas,
  };
}
