import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  scrapeFuente,
  slugify,
  type FuenteConfig,
  type ScrapedItem,
} from "./scraper";
import { normalizeFuenteRef, type ResultadoImportacion } from "./types";

type DbClient = SupabaseClient<Database>;

// ============================================================
// Importador específico Big Bus Madrid.
// Jerarquía fija (no la inventa el scrape genérico):
//   bigbus-madrid
//     ├─ bigbus-bus-tours-madrid
//     ├─ bigbus-excursiones-de-un-dia
//     └─ bigbus-toledo-bus-tours
// Solo actualiza hojas bajo esos grupos; nunca deja productos en la raíz.
// ============================================================

const ROOT_SLUG = "bigbus-madrid";

const LISTADOS = [
  {
    slug: "bigbus-bus-tours-madrid",
    label: "Bus Tours Madrid",
    url: "https://www.bigbustours.com/es/madrid/billetes-pases-tour-madrid",
  },
  {
    slug: "bigbus-excursiones-de-un-dia",
    label: "Excursiones de un día",
    url: "https://www.bigbustours.com/es/madrid/billetes-pases-tour-madrid?cat=43",
  },
  {
    slug: "bigbus-toledo-bus-tours",
    label: "Excursiones en autobús por Toledo",
    url: "https://www.bigbustours.com/es/madrid/billetes-pases-tour-madrid?cat=46",
  },
] as const;

const SELECTORES: FuenteConfig = {
  item: ".ticket-card",
  titulo: ".ticket-card__info-name",
  descripcion: ".ticket-card__info-sub",
  precio: ".ticket-card__price-final",
  imagen: ".ticket-card__img-container img",
  duracion: ".ticket-card__top-duration",
  detalle: {
    descripcion: ".pdp-head__description-raw, .pdp-head__description-content",
  },
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
    parentId: string | null;
    slug: string;
    titulo: string;
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
        parent_id: ctx.parentId,
        importado_at: ctx.ahora,
        titulo_i18n: { es: ctx.titulo },
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
      parent_id: ctx.parentId,
      slug: ctx.slug,
      titulo_i18n: { es: ctx.titulo },
      subtitulo_i18n: {},
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

export async function importarBigBus(
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
  if (!prov) throw new Error("Proveedor Big Bus no encontrado.");

  const cfg = (prov.fuente_config ?? {}) as Record<string, unknown>;
  const categoryId = await categoriaDestino(
    db,
    tenantId,
    typeof cfg.categoria_id === "string" ? cfg.categoria_id : undefined
  );
  if (!categoryId) {
    throw new Error("No hay categoría destino para Big Bus.");
  }

  // 1) Árbol fijo siempre publicado.
  const rootId = await asegurarGrupo(db, {
    tenantId,
    providerId,
    categoryId,
    parentId: null,
    slug: ROOT_SLUG,
    titulo: "Big Bus Madrid",
    ahora,
  });
  notas.push(`Raíz ${ROOT_SLUG} OK.`);

  const grupoIds = new Map<string, string>();
  for (const g of LISTADOS) {
    const id = await asegurarGrupo(db, {
      tenantId,
      providerId,
      categoryId,
      parentId: rootId,
      slug: g.slug,
      titulo: g.label,
      ahora,
    });
    grupoIds.set(g.slug, id);
  }
  notas.push(`Grupos fijos: ${LISTADOS.map((g) => g.slug).join(", ")}.`);

  // 2) Servicios existentes del proveedor (hojas con fuente_ref).
  const { data: existentesRaw } = await db
    .from("services")
    .select(
      "id, slug, fuente_ref, tipo_nodo, estado, descripcion_i18n, instrucciones_i18n, punto_encuentro_i18n, subtitulo_i18n, duracion_i18n"
    )
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .eq("tipo_nodo", "servicio");

  type Existente = {
    id: string;
    slug: string;
    fuente_ref: string | null;
    estado: string;
    descripcion_i18n: Record<string, string>;
    instrucciones_i18n: Record<string, string>;
    punto_encuentro_i18n: Record<string, string>;
    subtitulo_i18n: Record<string, string>;
    duracion_i18n: Record<string, string>;
  };
  const porRef = new Map<string, Existente>();
  const slugsUsados = new Set<string>();
  for (const e of existentesRaw ?? []) {
    slugsUsados.add(e.slug);
    if (!e.fuente_ref) continue;
    porRef.set(normalizeFuenteRef(e.fuente_ref), {
      id: e.id,
      slug: e.slug,
      fuente_ref: e.fuente_ref,
      estado: e.estado,
      descripcion_i18n: asI18n(e.descripcion_i18n),
      instrucciones_i18n: asI18n(e.instrucciones_i18n),
      punto_encuentro_i18n: asI18n(e.punto_encuentro_i18n),
      subtitulo_i18n: asI18n(e.subtitulo_i18n),
      duracion_i18n: asI18n(e.duracion_i18n),
    });
  }

  const listadoRefs = new Set(LISTADOS.map((g) => normalizeFuenteRef(g.url)));
  const vistos = new Set<string>();
  let detectados = 0;
  let creados = 0;
  let actualizados = 0;
  let despublicados = 0;
  let errores = 0;
  let metodo: ResultadoImportacion["metodo"] = "selectores";

  // 3) Scrapear cada listado y colgar productos bajo su grupo.
  for (const listado of LISTADOS) {
    const parentId = grupoIds.get(listado.slug)!;
    const scrape = await scrapeFuente(listado.url, SELECTORES);
    notas.push(`${listado.slug}: ${scrape.metodo} → ${scrape.items.length} items.`);
    for (const n of scrape.notas) notas.push(`  ${n}`);
    if (scrape.metodo !== "ninguno") metodo = scrape.metodo;
    detectados += scrape.items.length;

    for (const item of scrape.items) {
      try {
        await upsertHojaBigBus(db, {
          item,
          tenantId,
          providerId,
          categoryId,
          parentId,
          ahora,
          listadoRefs,
          porRef,
          slugsUsados,
          vistos,
          onCreado: () => {
            creados += 1;
          },
          onActualizado: () => {
            actualizados += 1;
          },
          onOmitido: (m) => notas.push(m),
        });
      } catch (e) {
        errores += 1;
        notas.push(`"${item.titulo}": ${e instanceof Error ? e.message : "error"}`);
      }
    }
  }

  // 4) Despublicar solo hojas con fuente_ref que ya no están en ningún listado.
  //    Nunca tocar los grupos fijos.
  const hojasConRef = (existentesRaw ?? []).filter(
    (e) => e.fuente_ref && e.tipo_nodo === "servicio"
  );
  const vistas = hojasConRef.filter((e) =>
    vistos.has(normalizeFuenteRef(e.fuente_ref!))
  ).length;
  const cobertura = hojasConRef.length === 0 ? 1 : vistas / hojasConRef.length;

  if (detectados > 0 && cobertura >= 0.5) {
    for (const e of hojasConRef) {
      if (!e.fuente_ref) continue;
      if (vistos.has(normalizeFuenteRef(e.fuente_ref))) continue;
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
    if (despublicados > 0) {
      notas.push(`Despublicados ${despublicados} productos ausentes.`);
    }
  } else if (detectados === 0) {
    notas.push("Sin items: no se despublica nada.");
  } else {
    notas.push(
      `Cobertura insuficiente (${vistas}/${hojasConRef.length}): no se despublica nada.`
    );
  }

  // Limpiar basura conocida del import genérico.
  await db
    .from("services")
    .update({ estado: "despublicado", activo: false })
    .eq("tenant_id", tenantId)
    .eq("provider_id", providerId)
    .in("slug", ["grp-bus-tours-madrid", "entradas-y-pases-para-madrid"]);

  const estado: ResultadoImportacion["estado"] =
    detectados === 0 && errores === 0
      ? "error"
      : errores > 0
        ? "parcial"
        : "ok";

  await db.from("import_runs").insert({
    tenant_id: tenantId,
    provider_id: providerId,
    fuente_url: prov.fuente_url,
    estado: detectados === 0 ? "error" : estado,
    detectados,
    creados,
    actualizados,
    errores,
    detalle: {
      importador: "bigbus",
      metodo,
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
    metodo: "bigbus",
    notas,
  };
}

async function upsertHojaBigBus(
  db: DbClient,
  args: {
    item: ScrapedItem;
    tenantId: string;
    providerId: string;
    categoryId: string;
    parentId: string;
    ahora: string;
    listadoRefs: Set<string>;
    porRef: Map<string, {
      id: string;
      slug: string;
      fuente_ref: string | null;
      estado: string;
      descripcion_i18n: Record<string, string>;
      instrucciones_i18n: Record<string, string>;
      punto_encuentro_i18n: Record<string, string>;
      subtitulo_i18n: Record<string, string>;
      duracion_i18n: Record<string, string>;
    }>;
    slugsUsados: Set<string>;
    vistos: Set<string>;
    onCreado: () => void;
    onActualizado: () => void;
    onOmitido: (msg: string) => void;
  }
): Promise<void> {
  const refNorm = normalizeFuenteRef(args.item.ref);
  if (args.listadoRefs.has(refNorm)) {
    args.onOmitido(`Omitido (listado): ${args.item.titulo}`);
    return;
  }
  args.vistos.add(refNorm);

  const descI18n = asI18n(args.item.descripcion_i18n);
  const texto = (args.item.descripcion ?? "").trim();
  if (texto && !descI18n.es) descI18n.es = texto;
  const instI18n = asI18n(args.item.instrucciones_i18n);
  const inst = (args.item.instrucciones ?? "").trim();
  if (inst && !instI18n.es) instI18n.es = inst;
  const descPrincipal = descI18n.es ?? texto;
  const sub: Record<string, string> = descPrincipal
    ? { es: descPrincipal.slice(0, 240) }
    : {};
  const duracion = (args.item.duracion ?? "").trim();

  const existe = args.porRef.get(refNorm);
  if (existe) {
    const { error } = await db
      .from("services")
      .update({
        titulo_i18n: { es: args.item.titulo },
        subtitulo_i18n: mergeI18n(existe.subtitulo_i18n, sub),
        descripcion_i18n: mergeI18n(existe.descripcion_i18n, descI18n),
        instrucciones_i18n: mergeI18n(existe.instrucciones_i18n, instI18n),
        duracion_i18n: duracion
          ? mergeI18n(existe.duracion_i18n, { es: duracion })
          : existe.duracion_i18n,
        precio_desde: args.item.precio ?? null,
        imagen_url: args.item.imagen ?? null,
        url_redireccion: args.item.url ?? null,
        parent_id: args.parentId,
        tipo_pago: "derivado",
        tipo_nodo: "servicio",
        estado: "publicado",
        activo: true,
        importado_at: args.ahora,
        fuente_ref: args.item.ref,
      })
      .eq("id", existe.id)
      .eq("tenant_id", args.tenantId);
    if (error) throw new Error(error.message);
    args.onActualizado();
    return;
  }

  let slug = slugify(args.item.titulo) || "item";
  let i = 2;
  while (args.slugsUsados.has(slug)) slug = `${slugify(args.item.titulo)}-${i++}`;
  args.slugsUsados.add(slug);

  const { error } = await db.from("services").insert({
    tenant_id: args.tenantId,
    provider_id: args.providerId,
    category_id: args.categoryId,
    parent_id: args.parentId,
    slug,
    titulo_i18n: { es: args.item.titulo },
    subtitulo_i18n: sub,
    descripcion_i18n: descI18n,
    instrucciones_i18n: instI18n,
    duracion_i18n: duracion ? { es: duracion } : {},
    punto_encuentro_i18n: {},
    tipo_nodo: "servicio",
    tipo_pago: "derivado",
    estado: "publicado",
    activo: true,
    precio_desde: args.item.precio ?? null,
    moneda: args.item.moneda || "EUR",
    imagen_url: args.item.imagen ?? null,
    url_redireccion: args.item.url ?? null,
    fuente_ref: args.item.ref,
    importado_at: args.ahora,
  });
  if (error) throw new Error(error.message);
  args.onCreado();
}
