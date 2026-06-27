"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";
import type { Branding } from "@/lib/panel/tenant";
import type { Json } from "@/lib/database.types";

export interface FormState {
  ok?: boolean;
  error?: string;
}

const colorRe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const schema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(80),
  accent: z.string().regex(colorRe, "Color de acento no válido"),
  ink: z.string().regex(colorRe, "Color de tinta no válido"),
  bone: z.string().regex(colorRe, "Color de fondo no válido"),
  mark: z.string().max(3).optional(),
  serif: z.string().max(60).optional(),
  sans: z.string().max(60).optional(),
});

export async function guardarBranding(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "design.edit");

  const parsed = schema.safeParse({
    nombre: formData.get("nombre"),
    accent: formData.get("accent"),
    ink: formData.get("ink"),
    bone: formData.get("bone"),
    mark: formData.get("mark") ?? undefined,
    serif: formData.get("serif") ?? undefined,
    sans: formData.get("sans") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  const branding: Branding = {
    colors: { accent: d.accent, ink: d.ink, bone: d.bone },
    fonts: { serif: d.serif || "DM Serif Display", sans: d.sans || "Inter" },
    mark: (d.mark || d.nombre.charAt(0)).toUpperCase(),
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update({ nombre: d.nombre, branding: branding as unknown as Json })
    .eq("id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/design");
  revalidatePath("/panel", "layout");
  return { ok: true };
}
