import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { scrapeFuente, slugify, type FuenteConfig, type ScrapedItem, type TierConfig } from "./scraper";

type DbClient = SupabaseClient<Database>;

export interface ResultadoImportacion {
  estado: "ok" | "parcial" | "error";
  detectados: number;
  creados: number;
  actualizados: number;
  errores: number;
  metodo: string;
  notas: string[];
}

interface ProviderFuente {
  id: string;
  tenant_id: string;
  fuente_url: string | null;
  fuente_config: Record<string, unknown>;
}

// Resuelve la categoría destino: la indicada en fuente_config.categoria_id (si
// pertenece al tenant) o, en su defecto, la primera categoría del tenant.
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

export async function importarProveedor(
  tenantId: string,
  providerId: string,
  db?: DbClient
): Promise<ResultadoImportacion> {
  const supabase: DbClient = db ?? (await createSupabaseServerClient());

  const { data: provRaw } = await supabase
    .from("providers")
    .select("id, tenant_id, fuente_url, fuente_config")
    .eq("id", providerId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const prov = provRaw as ProviderFuente | null;
  if (!prov) throw new Error("Proveedor no encontrado.");
  if (!prov.fuente_url) throw new Error("Este proveedor no tiene URL de fuente configurada.");

  const cfg = (prov.fuente_config ?? {}) as Record<string, unknown>;
  const detalleCfg =
    cfg.detalle && typeof cfg.detalle === "object" && !Array.isArray(cfg.detalle)
      ? (cfg.detalle as { descripcion?: string })
      : undefined;
  const selectores: FuenteConfig = {
    item: cfg.item as string | undefined,
    titulo: cfg.titulo as string | undefined,
    descripcion: cfg.descripcion as string | undefined,
    punto_encuentro: cfg.punto_encuentro as string | undefined,
    duracion: cfg.duracion as string | undefined,
    precio: cfg.precio as string | undefined,
    imagen: cfg.imagen as string | undefined,
    enlace: cfg.enlace as string | undefined,
    grupo: cfg.grupo as string | undefined,
    solo_gratuitos: cfg.solo_gratuitos === true,
    tiers_config: Array.isArray(cfg.tiers_config)
      ? (cfg.tiers_config as TierConfig[])
      : undefined,
    // Imprescindible para el batch/cron: sin esto no se recupera la PDP
    // (descripción larga + instrucciones de activación del billete).
    detalle: detalleCfg?.descripcion
      ? { descripcion: detalleCfg.descripcion }
      : undefined,
  };

  const categoryId = await categoriaDestino(supabase, tenantId, cfg.categoria_id as string | undefined);
  if (!categoryId) {
    throw new Error("No hay ninguna categoría donde colocar los productos importados.");
  }

  const scrape = await scrapeFuente(prov.fuente_url, selectores);
  const notas = [...scrape.notas];

  // Servicios ya importados de este proveedor (idempotencia por fuente_ref).
  const { data: existentesRaw } = await supabase
    .from("services")
    .select(
      "id, slug, fuente_ref, tipo_nodo, descripcion_i18n, instrucciones_i18n, punto_encuentro_i18n, subtitulo_i18n, duracion_i18n"
    )
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .not("fuente_ref", "is", null);
  type Existente = {
    id: string;
    slug: string;
    descripcion_i18n: Record<string, string>;
    instrucciones_i18n: Record<string, string>;
    punto_encuentro_i18n: Record<string, string>;
    subtitulo_i18n: Record<string, string>;
    duracion_i18n: Record<string, string>;
  };
  const existentes = new Map<string, Existente>();
  for (const e of existentesRaw ?? []) {
    if (!e.fuente_ref) continue;
    existentes.set(e.fuente_ref, {
      id: e.id,
      slug: e.slug,
      descripcion_i18n: asI18n(e.descripcion_i18n),
      instrucciones_i18n: asI18n(e.instrucciones_i18n),
      punto_encuentro_i18n: asI18n(e.punto_encuentro_i18n),
      subtitulo_i18n: asI18n(e.subtitulo_i18n),
      duracion_i18n: asI18n(e.duracion_i18n),
    });
  }
  const slugsUsados = new Set<string>((existentesRaw ?? []).map((e) => e.slug));

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  // 1) Asegurar los nodos 'grupo' para cada etiqueta de agrupación detectada.
  const grupos = new Map<string, string>(); // label -> service id (parent)
  const etiquetas = Array.from(
    new Set(scrape.items.map((i) => (i.grupo ?? "").trim()).filter(Boolean))
  );
  for (const label of etiquetas) {
    const ref = `grupo:${slugify(label)}`;
    const ya = existentes.get(ref);
    if (ya) {
      grupos.set(label, ya.id);
      continue;
    }
    const slug = unicoSlug(`grp-${slugify(label)}`, slugsUsados);
    const { data, error } = await supabase
      .from("services")
      .insert({
        tenant_id: tenantId,
        provider_id: providerId,
        category_id: categoryId,
        slug,
        titulo_i18n: { es: label },
        subtitulo_i18n: {},
        tipo_nodo: "grupo",
        estado: "borrador",
        activo: false,
        fuente_ref: ref,
      })
      .select("id")
      .single();
    if (error || !data) {
      errores++;
      notas.push(`Grupo "${label}": ${error?.message ?? "no creado"}`);
      continue;
    }
    grupos.set(label, data.id);
    creados++;
  }

  // 2) Upsert de cada item como hoja 'servicio' en borrador (derivado a origen).
  for (const item of scrape.items) {
    try {
      const parentId = item.grupo ? grupos.get(item.grupo.trim()) ?? null : null;
      const existe = existentes.get(item.ref);
      const fila = mapItem(item, { tenantId, providerId, categoryId, parentId });

      let serviceId: string;
      if (existe) {
        // Actualizamos contenido pero respetamos el slug y el estado revisado.
        // Merge i18n: el scrape no debe borrar idiomas ya curados (p.ej. EN)
        // ni vaciar instrucciones si la PDP no las trae en esta pasada.
        const { error } = await supabase
          .from("services")
          .update({
            titulo_i18n: fila.titulo_i18n,
            subtitulo_i18n: mergeI18n(existe.subtitulo_i18n, fila.subtitulo_i18n),
            descripcion_i18n: mergeI18n(existe.descripcion_i18n, fila.descripcion_i18n),
            punto_encuentro_i18n: mergeI18n(
              existe.punto_encuentro_i18n,
              fila.punto_encuentro_i18n
            ),
            instrucciones_i18n: mergeI18n(
              existe.instrucciones_i18n,
              fila.instrucciones_i18n
            ),
            duracion_i18n: mergeI18n(existe.duracion_i18n, fila.duracion_i18n),
            precio_desde: fila.precio_desde,
            imagen_url: fila.imagen_url,
            url_redireccion: fila.url_redireccion,
            parent_id: parentId,
          })
          .eq("id", existe.id)
          .eq("tenant_id", tenantId);
        if (error) throw new Error(error.message);
        serviceId = existe.id;
        actualizados++;
      } else {
        const slug = unicoSlug(slugify(item.titulo), slugsUsados);
        const { data: newSvc, error } = await supabase
          .from("services")
          .insert({ ...fila, slug })
          .select("id")
          .single();
        if (error || !newSvc) throw new Error(error?.message ?? "no creado");
        serviceId = newSvc.id;
        creados++;
      }

      // Upsert de tarifas por tipo de pasajero si el scraper las detectó
      if (item.tiers && item.tiers.length > 0) {
        for (const tier of item.tiers) {
          await supabase
            .from("service_price_tiers")
            .upsert(
              {
                service_id: serviceId,
                tipo: tier.tipo,
                label_i18n: selectores.tiers_config
                  ? (() => {
                      const tc = selectores.tiers_config!.find(
                        (t) => t.tipo === tier.tipo
                      );
                      const out: Record<string, string> = {};
                      if (tc?.label_es) out["es"] = tc.label_es;
                      if (tc?.label_en) out["en"] = tc.label_en;
                      if (!out["es"]) out["es"] = tier.label;
                      return out;
                    })()
                  : { es: tier.label },
                precio: tier.precio,
                orden: (selectores.tiers_config?.findIndex((t) => t.tipo === tier.tipo) ?? 0),
              },
              { onConflict: "service_id,tipo" }
            );
        }
      }
    } catch (e) {
      errores++;
      notas.push(`"${item.titulo}": ${e instanceof Error ? e.message : "error"}`);
    }
  }

  const estado: ResultadoImportacion["estado"] =
    scrape.items.length === 0 && errores === 0
      ? "error"
      : errores > 0
        ? "parcial"
        : "ok";

  // Auditoría de la ejecución.
  await supabase.from("import_runs").insert({
    tenant_id: tenantId,
    provider_id: providerId,
    fuente_url: prov.fuente_url,
    estado: scrape.items.length === 0 ? "error" : estado,
    detectados: scrape.items.length,
    creados,
    actualizados,
    errores,
    detalle: { metodo: scrape.metodo, notas },
  });

  return {
    estado: scrape.items.length === 0 ? "error" : estado,
    detectados: scrape.items.length,
    creados,
    actualizados,
    errores,
    metodo: scrape.metodo,
    notas,
  };
}

function unicoSlug(base: string, usados: Set<string>): string {
  let slug = base || "item";
  let i = 2;
  while (usados.has(slug)) {
    slug = `${base}-${i++}`;
  }
  usados.add(slug);
  return slug;
}

function asI18n(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) out[k] = val.trim();
  }
  return out;
}

// Fusiona i18n: solo sobrescribe claves con texto nuevo no vacío.
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

function mapItem(
  item: ScrapedItem,
  ctx: { tenantId: string; providerId: string; categoryId: string; parentId: string | null }
) {
  const texto = (item.descripcion ?? "").trim();
  const instrucciones = (item.instrucciones ?? "").trim();
  const descI18n = asI18n(item.descripcion_i18n);
  if (texto && !descI18n.es) descI18n.es = texto;
  const instI18n = asI18n(item.instrucciones_i18n);
  if (instrucciones && !instI18n.es) instI18n.es = instrucciones;
  const descPrincipal = descI18n.es ?? texto;
  const sub: Record<string, string> = descPrincipal
    ? { es: descPrincipal.slice(0, 240) }
    : {};
  const puntoEnc = (item.punto_encuentro ?? "").trim();
  const duracion = (item.duracion ?? "").trim();
  const puntoI18n: Record<string, string> = puntoEnc ? { es: puntoEnc } : {};
  const duracionI18n: Record<string, string> = duracion ? { es: duracion } : {};
  return {
    tenant_id: ctx.tenantId,
    provider_id: ctx.providerId,
    category_id: ctx.categoryId,
    parent_id: ctx.parentId,
    titulo_i18n: { es: item.titulo },
    subtitulo_i18n: sub,
    descripcion_i18n: descI18n,
    punto_encuentro_i18n: puntoI18n,
    instrucciones_i18n: instI18n,
    duracion_i18n: duracionI18n,
    tipo_nodo: "servicio" as const,
    tipo_pago: "derivado" as const,
    estado: "borrador" as const,
    activo: false,
    precio_desde: item.precio ?? null,
    moneda: item.moneda || "EUR",
    imagen_url: item.imagen ?? null,
    url_redireccion: item.url ?? null,
    fuente_ref: item.ref,
  };
}
