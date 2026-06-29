import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scrapeFuente, slugify, type FuenteConfig, type ScrapedItem, type TierConfig } from "./scraper";

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
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
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
  providerId: string
): Promise<ResultadoImportacion> {
  const supabase = await createSupabaseServerClient();

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
  const selectores: FuenteConfig = {
    item: cfg.item as string | undefined,
    titulo: cfg.titulo as string | undefined,
    descripcion: cfg.descripcion as string | undefined,
    duracion: cfg.duracion as string | undefined,
    precio: cfg.precio as string | undefined,
    imagen: cfg.imagen as string | undefined,
    enlace: cfg.enlace as string | undefined,
    grupo: cfg.grupo as string | undefined,
    tiers_config: Array.isArray(cfg.tiers_config)
      ? (cfg.tiers_config as TierConfig[])
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
    .select("id, slug, fuente_ref, tipo_nodo")
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .not("fuente_ref", "is", null);
  const existentes = new Map<string, { id: string; slug: string }>();
  for (const e of existentesRaw ?? []) {
    if (e.fuente_ref) existentes.set(e.fuente_ref, { id: e.id, slug: e.slug });
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
        const { error } = await supabase
          .from("services")
          .update({
            titulo_i18n: fila.titulo_i18n,
            subtitulo_i18n: fila.subtitulo_i18n,
            duracion_i18n: fila.duracion_i18n,
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

function mapItem(
  item: ScrapedItem,
  ctx: { tenantId: string; providerId: string; categoryId: string; parentId: string | null }
) {
  const texto = (item.descripcion ?? "").trim();
  const sub = texto ? { es: texto.slice(0, 240) } : {};
  const duracion = (item.duracion ?? "").trim();
  return {
    tenant_id: ctx.tenantId,
    provider_id: ctx.providerId,
    category_id: ctx.categoryId,
    parent_id: ctx.parentId,
    titulo_i18n: { es: item.titulo },
    subtitulo_i18n: sub,
    duracion_i18n: duracion ? { es: duracion } : {},
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
