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

const reglaInputSchema = z.object({
  providerId: z.string().uuid(),
  tipoCalculo: z.enum(["porcentaje", "fijo"]),
  plataforma: z.coerce.number().min(0).max(1_000_000),
  operador: z.coerce.number().min(0).max(1_000_000),
});

// Guarda las comisiones de ámbito proveedor (plataforma + operador) para
// todos los proveedores del formulario. El remanente es siempre del proveedor
// de servicio; Stripe le transfiere esa parte tras el cobro.
export async function guardarComisionesProveedor(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "settings.manage");

  const providerIds = formData.getAll("provider_id").map(String);
  if (providerIds.length === 0) {
    return { error: "No hay proveedores que guardar." };
  }

  const filas: z.infer<typeof reglaInputSchema>[] = [];
  for (const providerId of providerIds) {
    const parsed = reglaInputSchema.safeParse({
      providerId,
      tipoCalculo: formData.get(`tipo_${providerId}`) ?? "porcentaje",
      plataforma: formData.get(`plataforma_${providerId}`) ?? 0,
      operador: formData.get(`operador_${providerId}`) ?? 0,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Datos de comisión no válidos." };
    }
    const f = parsed.data;
    if (f.tipoCalculo === "porcentaje" && f.plataforma + f.operador > 100) {
      return {
        error: "La suma de plataforma + operador no puede superar el 100 % en ningún proveedor.",
      };
    }
    filas.push(f);
  }

  const supabase = await createSupabaseServerClient();
  const { data: propios, error: errP } = await supabase
    .from("providers")
    .select("id")
    .eq("tenant_id", ctx.currentTenant.id)
    .in(
      "id",
      filas.map((f) => f.providerId)
    );
  if (errP) return { error: `No se pudieron validar proveedores: ${errP.message}` };
  const permitidos = new Set((propios ?? []).map((p) => p.id));
  if (filas.some((f) => !permitidos.has(f.providerId))) {
    return { error: "Hay proveedores que no pertenecen a este tenant." };
  }

  for (const f of filas) {
    for (const benef of ["plataforma", "operador"] as const) {
      const valor = benef === "plataforma" ? f.plataforma : f.operador;
      const activo = valor > 0;
      const { data: existente, error: errSel } = await supabase
        .from("commission_rules")
        .select("id")
        .eq("tenant_id", ctx.currentTenant.id)
        .eq("ambito", "proveedor")
        .eq("provider_id", f.providerId)
        .eq("beneficiario", benef)
        .maybeSingle();
      if (errSel) return { error: `No se pudo leer la regla: ${errSel.message}` };

      if (existente) {
        const { error } = await supabase
          .from("commission_rules")
          .update({
            tipo_calculo: f.tipoCalculo,
            valor,
            activo,
            moneda: f.tipoCalculo === "fijo" ? "EUR" : null,
          })
          .eq("id", existente.id);
        if (error) return { error: `No se pudo actualizar la comisión: ${error.message}` };
      } else if (activo) {
        const { error } = await supabase.from("commission_rules").insert({
          tenant_id: ctx.currentTenant.id,
          ambito: "proveedor",
          provider_id: f.providerId,
          service_id: null,
          beneficiario: benef,
          tipo_calculo: f.tipoCalculo,
          valor,
          activo: true,
          moneda: f.tipoCalculo === "fijo" ? "EUR" : null,
        });
        if (error) return { error: `No se pudo crear la comisión: ${error.message}` };
      }
    }
  }

  revalidatePath("/panel/settings");
  return { ok: true };
}
