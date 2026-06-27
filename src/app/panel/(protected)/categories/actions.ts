"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";

export interface FormState {
  error?: string;
}

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().regex(slugRe, "Slug inválido (minúsculas, guiones)"),
  orden: z.string().optional(),
  activo: z.string().optional(),
});

async function localesTenant(tenantId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("tenants").select("locales").eq("id", tenantId).maybeSingle();
  return data?.locales ?? ["es"];
}

function i18nDesdeForm(formData: FormData, prefijo: string, locales: string[]) {
  const out: Record<string, string> = {};
  for (const l of locales) {
    const v = (formData.get(`${prefijo}_${l}`) as string | null)?.trim();
    if (v) out[l] = v;
  }
  return out;
}

export async function guardarCategoria(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const tenantId = ctx.currentTenant.id;

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    slug: formData.get("slug"),
    orden: formData.get("orden") ?? undefined,
    activo: formData.get("activo") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const d = parsed.data;

  const locales = await localesTenant(tenantId);
  const nombre = i18nDesdeForm(formData, "nombre", locales);
  const subtitulo = i18nDesdeForm(formData, "subtitulo", locales);
  if (Object.keys(nombre).length === 0) return { error: "El nombre es obligatorio." };

  const supabase = await createSupabaseServerClient();
  const fila = {
    tenant_id: tenantId,
    slug: d.slug,
    nombre_i18n: nombre,
    subtitulo_i18n: subtitulo,
    orden: d.orden ? parseInt(d.orden, 10) || 0 : 0,
    activo: d.activo === "on" || d.activo === "true",
  };

  if (d.id && d.id !== "") {
    const { error } = await supabase.from("categories").update(fila).eq("id", d.id).eq("tenant_id", tenantId);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    const { error } = await supabase.from("categories").insert(fila);
    if (error) return { error: `No se pudo crear: ${error.message}` };
  }

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/categories");
  redirect("/panel/categories");
}

export async function eliminarCategoria(id: string): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/categories");
}

export async function alternarVisibilidadCategoria(id: string, activo: boolean): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ activo })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/categories");
}

// Mueve una categoría arriba/abajo intercambiando el orden con su vecina.
export async function moverCategoria(id: string, dir: "up" | "down"): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { data: cats } = await supabase
    .from("categories")
    .select("id, orden")
    .eq("tenant_id", ctx.currentTenant.id)
    .order("orden", { ascending: true });
  if (!cats) return;
  const idx = cats.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const vecinoIdx = dir === "up" ? idx - 1 : idx + 1;
  if (vecinoIdx < 0 || vecinoIdx >= cats.length) return;

  const a = cats[idx];
  const b = cats[vecinoIdx];
  await Promise.all([
    supabase.from("categories").update({ orden: b.orden }).eq("id", a.id).eq("tenant_id", ctx.currentTenant.id),
    supabase.from("categories").update({ orden: a.orden }).eq("id", b.id).eq("tenant_id", ctx.currentTenant.id),
  ]);

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/categories");
}
