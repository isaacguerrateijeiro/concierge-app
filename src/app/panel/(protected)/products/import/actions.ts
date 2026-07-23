"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";
import { scrapeFuente, type FuenteConfig } from "@/lib/import/scraper";
import { importarProveedor, type ResultadoImportacion } from "@/lib/import/importar";
import { actualizarCatalogoTenant, type ResultadoBatch } from "@/lib/import/batch";

export interface FuenteFormState {
  error?: string;
  ok?: boolean;
}

const fuenteSchema = z.object({
  provider_id: z.string().uuid("Proveedor no válido"),
  fuente_url: z.string().url("URL no válida").optional().or(z.literal("")),
  categoria_id: z.string().uuid().optional().or(z.literal("")),
  item: z.string().optional(),
  titulo: z.string().optional(),
  precio: z.string().optional(),
  imagen: z.string().optional(),
  enlace: z.string().optional(),
  grupo: z.string().optional(),
  descripcion: z.string().optional(),
  duracion: z.string().optional(),
  punto_encuentro: z.string().optional(),
  solo_gratuitos: z.string().optional(),
});

function limpio(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export async function guardarFuente(
  _prev: FuenteFormState,
  formData: FormData
): Promise<FuenteFormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const tenantId = ctx.currentTenant.id;

  const parsed = fuenteSchema.safeParse({
    provider_id: formData.get("provider_id"),
    fuente_url: formData.get("fuente_url") ?? "",
    categoria_id: formData.get("categoria_id") ?? "",
    item: formData.get("item") ?? undefined,
    titulo: formData.get("titulo") ?? undefined,
    precio: formData.get("precio") ?? undefined,
    imagen: formData.get("imagen") ?? undefined,
    enlace: formData.get("enlace") ?? undefined,
    grupo: formData.get("grupo") ?? undefined,
    descripcion: formData.get("descripcion") ?? undefined,
    duracion: formData.get("duracion") ?? undefined,
    punto_encuentro: formData.get("punto_encuentro") ?? undefined,
    solo_gratuitos: formData.get("solo_gratuitos") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  const supabase = await createSupabaseServerClient();
  // Conservamos claves avanzadas ya configuradas (detalle PDP, grupos, tiers…).
  const { data: prev } = await supabase
    .from("providers")
    .select("fuente_config")
    .eq("id", d.provider_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const prevCfg =
    prev?.fuente_config && typeof prev.fuente_config === "object" && !Array.isArray(prev.fuente_config)
      ? (prev.fuente_config as Record<string, unknown>)
      : {};

  const config: Record<string, unknown> = {};
  for (const k of ["detalle", "grupos", "tiers_config", "parent_slug", "grupo_default"] as const) {
    if (prevCfg[k] !== undefined) config[k] = prevCfg[k];
  }
  if (d.categoria_id) config.categoria_id = d.categoria_id;
  for (const k of [
    "item", "titulo", "precio", "imagen", "enlace", "grupo",
    "descripcion", "duracion", "punto_encuentro",
  ] as const) {
    const v = limpio(d[k]);
    if (v) config[k] = v;
  }
  if (d.solo_gratuitos === "on" || d.solo_gratuitos === "true") {
    config.solo_gratuitos = true;
  }

  const { error } = await supabase
    .from("providers")
    .update({
      fuente_url: d.fuente_url || null,
      fuente_config: config as unknown as Json,
    })
    .eq("id", d.provider_id)
    .eq("tenant_id", tenantId);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/panel/products/import");
  return { ok: true };
}

const integracionSchema = z.object({
  provider_id: z.string().uuid("Proveedor no válido"),
  tipo: z.enum(["local", "bigbus"]).default("local"),
  endpoint: z.string().url("Endpoint no válido").optional().or(z.literal("")),
  api_key_ref: z.string().optional(),
});

// Guarda el adaptador de integración del proveedor (motor de stock local o API
// de Big Bus). Cuando el tipo es 'bigbus' y hay endpoint + referencia de
// credencial, el adaptador usará la API real; si no, cae al stock local.
export async function guardarIntegracion(
  _prev: FuenteFormState,
  formData: FormData
): Promise<FuenteFormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const tenantId = ctx.currentTenant.id;

  const parsed = integracionSchema.safeParse({
    provider_id: formData.get("provider_id"),
    tipo: formData.get("integracion_tipo") ?? "local",
    endpoint: formData.get("integracion_endpoint") ?? "",
    api_key_ref: formData.get("integracion_api_key_ref") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  const config: Record<string, string> = { tipo: d.tipo };
  const endpoint = limpio(d.endpoint);
  const apiKeyRef = limpio(d.api_key_ref);
  if (endpoint) config.endpoint = endpoint;
  if (apiKeyRef) config.api_key_ref = apiKeyRef;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("providers")
    .update({ integracion_config: config as unknown as Json })
    .eq("id", d.provider_id)
    .eq("tenant_id", tenantId);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/panel/products/import");
  return { ok: true };
}

export interface PreviewResultado {
  error?: string;
  metodo?: string;
  total?: number;
  muestra?: { titulo: string; precio: number | null; grupo: string | null; url: string | null }[];
  notas?: string[];
}

export async function previsualizarFuente(providerId: string): Promise<PreviewResultado> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();

  const { data: prov } = await supabase
    .from("providers")
    .select("fuente_url, fuente_config")
    .eq("id", providerId)
    .eq("tenant_id", ctx.currentTenant.id)
    .maybeSingle();
  if (!prov?.fuente_url) return { error: "Configura primero la URL de la fuente." };

  const cfg = (prov.fuente_config as Record<string, unknown>) ?? {};
  const selectores: FuenteConfig = {
    item: cfg.item as string | undefined,
    titulo: cfg.titulo as string | undefined,
    precio: cfg.precio as string | undefined,
    imagen: cfg.imagen as string | undefined,
    enlace: cfg.enlace as string | undefined,
    grupo: cfg.grupo as string | undefined,
    descripcion: cfg.descripcion as string | undefined,
    duracion: cfg.duracion as string | undefined,
    punto_encuentro: cfg.punto_encuentro as string | undefined,
    solo_gratuitos: cfg.solo_gratuitos === true,
  };

  const r = await scrapeFuente(prov.fuente_url, selectores);
  return {
    metodo: r.metodo,
    total: r.items.length,
    muestra: r.items.slice(0, 8).map((i) => ({
      titulo: i.titulo,
      precio: i.precio ?? null,
      grupo: i.grupo ?? null,
      url: i.url ?? null,
    })),
    notas: r.notas,
  };
}

// Actualización masiva: re-scrape de todos los proveedores del tenant con
// fuente configurada. Usa el cliente RLS del operador (capacidad catalog.edit).
export async function ejecutarActualizacionMasiva(): Promise<
  ResultadoBatch & { error?: string }
> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  try {
    const supabase = await createSupabaseServerClient();
    const r = await actualizarCatalogoTenant(ctx.currentTenant.id, supabase);
    revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
    revalidatePath("/", "layout");
    revalidatePath("/panel/products");
    revalidatePath("/panel/products/import");
    return r;
  } catch (e) {
    return {
      tenantId: ctx.currentTenant.id,
      proveedores: [],
      totales: { detectados: 0, creados: 0, actualizados: 0, despublicados: 0, errores: 0 },
      error: e instanceof Error ? e.message : "Error en la actualización masiva",
    };
  }
}

export async function ejecutarImportacion(
  providerId: string
): Promise<ResultadoImportacion & { error?: string }> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");

  try {
    const r = await importarProveedor(ctx.currentTenant.id, providerId);
    revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
    revalidatePath("/", "layout");
    revalidatePath("/panel/products");
    revalidatePath("/panel/products/import");
    return r;
  } catch (e) {
    return {
      estado: "error",
      detectados: 0,
      creados: 0,
      actualizados: 0,
      despublicados: 0,
      errores: 0,
      metodo: "ninguno",
      notas: [],
      error: e instanceof Error ? e.message : "Error en la importación",
    };
  }
}
