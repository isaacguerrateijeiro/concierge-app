"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { getTenantConfig } from "@/lib/panel/tenant";
import type { Json } from "@/lib/database.types";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  orden: z.coerce.number().int().min(0).max(9999).default(0),
  activo: z.boolean().default(true),
});

export async function guardarKiosko(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "devices.manage");

  const parsed = schema.safeParse({
    id: (formData.get("id") as string) || undefined,
    nombre: formData.get("nombre"),
    orden: formData.get("orden") ?? 0,
    activo: formData.get("activo") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // tipo_i18n localizado: una clave por idioma del tenant.
  const tenant = await getTenantConfig(ctx.currentTenant.id);
  const tipo: Record<string, string> = {};
  for (const l of tenant.locales) {
    const v = formData.get(`tipo_${l}`);
    if (typeof v === "string" && v.trim()) tipo[l] = v.trim();
  }

  const supabase = await createSupabaseServerClient();
  if (d.id) {
    const { error } = await supabase
      .from("locations")
      .update({ nombre: d.nombre, tipo_i18n: tipo as unknown as Json, orden: d.orden, activo: d.activo })
      .eq("id", d.id)
      .eq("tenant_id", ctx.currentTenant.id);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    const { error } = await supabase.from("locations").insert({
      tenant_id: ctx.currentTenant.id,
      nombre: d.nombre,
      tipo_i18n: tipo as unknown as Json,
      orden: d.orden,
      activo: d.activo,
    });
    if (error) return { error: `No se pudo crear: ${error.message}` };
  }

  revalidatePath("/panel/devices");
  return { ok: true };
}

export async function alternarKiosko(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "devices.manage");
  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("locations")
    .update({ activo: !activo })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) return { error: error.message };
  revalidatePath("/panel/devices");
  return { ok: true };
}

export async function eliminarKiosko(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "devices.manage");
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };
  revalidatePath("/panel/devices");
  return { ok: true };
}
