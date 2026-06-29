"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";
import { scrapeFuente, type FuenteConfig } from "@/lib/import/scraper";
import { importarProveedor, type ResultadoImportacion } from "@/lib/import/importar";

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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  const config: Record<string, string> = {};
  if (d.categoria_id) config.categoria_id = d.categoria_id;
  for (const k of ["item", "titulo", "precio", "imagen", "enlace", "grupo"] as const) {
    const v = limpio(d[k]);
    if (v) config[k] = v;
  }

  const supabase = await createSupabaseServerClient();
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

export async function ejecutarImportacion(
  providerId: string
): Promise<ResultadoImportacion & { error?: string }> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");

  try {
    const r = await importarProveedor(ctx.currentTenant.id, providerId);
    revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
    revalidatePath("/panel/products");
    revalidatePath("/panel/products/import");
    return r;
  } catch (e) {
    return {
      estado: "error",
      detectados: 0,
      creados: 0,
      actualizados: 0,
      errores: 0,
      metodo: "ninguno",
      notas: [],
      error: e instanceof Error ? e.message : "Error en la importación",
    };
  }
}
