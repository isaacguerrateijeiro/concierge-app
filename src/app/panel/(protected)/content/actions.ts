"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";
import { getTenantConfig } from "@/lib/panel/tenant";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const localeRe = /^[a-z]{2}(-[A-Z]{2})?$/;

export async function guardarTextos(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "design.edit");

  const locale = String(formData.get("locale") ?? "");
  const tenant = await getTenantConfig(ctx.currentTenant.id);
  if (!tenant.locales.includes(locale)) {
    return { error: "Idioma no válido." };
  }

  const textos: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("t__")) {
      const key = k.slice(3);
      textos[key] = String(v);
    }
  }

  const uiTextos = { ...tenant.uiTextos, [locale]: textos };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ ui_textos: uiTextos })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/content");
  return { ok: true };
}

export async function anadirIdioma(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "design.edit");

  const parsed = z
    .object({ locale: z.string().regex(localeRe, "Código de idioma no válido (ej. fr, pt-BR)") })
    .safeParse({ locale: String(formData.get("locale") ?? "").trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const locale = parsed.data.locale;

  const tenant = await getTenantConfig(ctx.currentTenant.id);
  if (tenant.locales.includes(locale)) {
    return { error: "Ese idioma ya está activo." };
  }

  const locales = [...tenant.locales, locale];
  // Sembramos con los textos del idioma por defecto para facilitar la traducción.
  const uiTextos = {
    ...tenant.uiTextos,
    [locale]: { ...(tenant.uiTextos[tenant.localeDefault] ?? {}) },
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ locales, ui_textos: uiTextos })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo añadir: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/content");
  return { ok: true };
}

export async function eliminarIdioma(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "design.edit");

  const locale = String(formData.get("locale") ?? "");
  const tenant = await getTenantConfig(ctx.currentTenant.id);

  if (locale === tenant.localeDefault) {
    return { error: "No puedes eliminar el idioma principal." };
  }
  if (!tenant.locales.includes(locale)) {
    return { error: "Idioma no válido." };
  }
  if (tenant.locales.length <= 1) {
    return { error: "Debe quedar al menos un idioma." };
  }

  const locales = tenant.locales.filter((l) => l !== locale);
  const uiTextos = { ...tenant.uiTextos };
  delete uiTextos[locale];

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ locales, ui_textos: uiTextos })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/content");
  return { ok: true };
}
