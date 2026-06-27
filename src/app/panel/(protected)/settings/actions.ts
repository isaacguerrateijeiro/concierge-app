"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";
import { getTenantConfig } from "@/lib/panel/tenant";
import type { Json } from "@/lib/database.types";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const CANALES = ["email", "sms", "whatsapp", "print"] as const;

export async function guardarEntrega(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "settings.manage");

  const tenant = await getTenantConfig(ctx.currentTenant.id);
  const canales = CANALES.filter((c) => formData.get(`canal_${c}`) === "on");
  if (canales.length === 0) {
    return { error: "Debe haber al menos un canal de entrega activo." };
  }

  const consentimiento: Record<string, string> = {};
  for (const l of tenant.locales) {
    const v = formData.get(`consent_${l}`);
    if (typeof v === "string" && v.trim()) consentimiento[l] = v.trim();
  }

  const entrega = {
    ...tenant.entregaConfig,
    canales,
    consentimiento,
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ entrega_config: entrega as unknown as Json })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/settings");
  return { ok: true };
}

const legalSchema = z.object({
  razon_social: z.string().max(140).optional(),
  nif: z.string().max(40).optional(),
  domicilio: z.string().max(240).optional(),
  soporte_email: z.union([z.literal(""), z.string().email()]).optional(),
  soporte_telefono: z.string().max(40).optional(),
  terminos_url: z.union([z.literal(""), z.string().url()]).optional(),
  privacidad_url: z.union([z.literal(""), z.string().url()]).optional(),
  iva_default: z.coerce.number().min(0).max(100).optional(),
});

export async function guardarLegal(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "settings.manage");

  const parsed = legalSchema.safeParse({
    razon_social: formData.get("razon_social") ?? undefined,
    nif: formData.get("nif") ?? undefined,
    domicilio: formData.get("domicilio") ?? undefined,
    soporte_email: formData.get("soporte_email") ?? undefined,
    soporte_telefono: formData.get("soporte_telefono") ?? undefined,
    terminos_url: formData.get("terminos_url") ?? undefined,
    privacidad_url: formData.get("privacidad_url") ?? undefined,
    iva_default: formData.get("iva_default") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const tenant = await getTenantConfig(ctx.currentTenant.id);
  const legal = { ...tenant.legalConfig, ...parsed.data };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ legal_config: legal as unknown as Json })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/settings");
  return { ok: true };
}
