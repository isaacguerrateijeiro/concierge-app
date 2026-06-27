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
  provider_id: z.string().uuid("Proveedor no válido"),
  category_id: z.string().uuid("Categoría no válida"),
  tipo_pago: z.enum(["integrado", "derivado"]),
  precio_desde: z.string().optional(),
  iva_tipo: z.string().optional(),
  url_redireccion: z.string().url("URL no válida").optional().or(z.literal("")),
  icono: z.string().optional(),
  orden: z.string().optional(),
  activo: z.string().optional(),
});

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function localesTenant(tenantId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("locales")
    .eq("id", tenantId)
    .maybeSingle();
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

export async function guardarServicio(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const tenantId = ctx.currentTenant.id;

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    slug: formData.get("slug"),
    provider_id: formData.get("provider_id"),
    category_id: formData.get("category_id"),
    tipo_pago: formData.get("tipo_pago"),
    precio_desde: formData.get("precio_desde") ?? undefined,
    iva_tipo: formData.get("iva_tipo") ?? undefined,
    url_redireccion: formData.get("url_redireccion") ?? "",
    icono: formData.get("icono") ?? undefined,
    orden: formData.get("orden") ?? undefined,
    activo: formData.get("activo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  const supabase = await createSupabaseServerClient();

  // Validar que proveedor y categoría pertenecen al tenant activo (RLS ya lo
  // limita en lectura, esto evita además referencias cruzadas en la escritura).
  const [{ data: prov }, { data: cat }] = await Promise.all([
    supabase.from("providers").select("id").eq("id", d.provider_id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("categories").select("id").eq("id", d.category_id).eq("tenant_id", tenantId).maybeSingle(),
  ]);
  if (!prov) return { error: "El proveedor no pertenece a este cliente." };
  if (!cat) return { error: "La categoría no pertenece a este cliente." };

  const locales = await localesTenant(tenantId);
  const titulo = i18nDesdeForm(formData, "titulo", locales);
  const subtitulo = i18nDesdeForm(formData, "subtitulo", locales);
  if (!titulo[locales[0]] && Object.keys(titulo).length === 0) {
    return { error: "El título es obligatorio." };
  }

  const fila = {
    tenant_id: tenantId,
    slug: d.slug,
    provider_id: d.provider_id,
    category_id: d.category_id,
    tipo_pago: d.tipo_pago,
    precio_desde: parseNum(d.precio_desde),
    iva_tipo: parseNum(d.iva_tipo),
    url_redireccion: d.url_redireccion || null,
    icono: d.icono || null,
    orden: parseNum(d.orden) ?? 0,
    activo: d.activo === "on" || d.activo === "true",
    titulo_i18n: titulo,
    subtitulo_i18n: subtitulo,
  };

  if (d.id && d.id !== "") {
    const { error } = await supabase.from("services").update(fila).eq("id", d.id).eq("tenant_id", tenantId);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    const { error } = await supabase.from("services").insert(fila);
    if (error) return { error: `No se pudo crear: ${error.message}` };
  }

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
  redirect("/panel/products");
}

export async function alternarVisibilidadServicio(
  id: string,
  activo: boolean
): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ activo })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
}

export async function eliminarServicio(id: string): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
}
