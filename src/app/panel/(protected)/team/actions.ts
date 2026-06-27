"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { ROLES, type Rol } from "@/lib/auth/roles";

export interface FormState {
  ok?: boolean;
  error?: string;
  aviso?: string;
}

const rolSchema = z.enum(ROLES as [Rol, ...Rol[]]);

// Genera una contraseña temporal legible para entregar al nuevo miembro.
function passwordTemporal(): string {
  const base = Math.random().toString(36).slice(2, 8);
  const num = Math.floor(10 + Math.random() * 89);
  return `Kioma-${base}${num}`;
}

export async function invitarMiembro(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "team.manage");

  const parsed = z
    .object({ email: z.string().email("Email no válido"), rol: rolSchema })
    .safeParse({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      rol: formData.get("rol"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { email, rol } = parsed.data;

  const admin = createSupabaseAdminClient();
  const tenantId = ctx.currentTenant.id;

  // ¿Existe ya un perfil con ese email?
  const { data: existente } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId = existente?.id ?? null;
  let aviso: string | undefined;

  if (!userId) {
    const tempPass = passwordTemporal();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPass,
      email_confirm: true,
      user_metadata: { nombre: email.split("@")[0] },
    });
    if (createErr || !created.user) {
      return { error: `No se pudo crear el usuario: ${createErr?.message ?? "desconocido"}` };
    }
    userId = created.user.id;
    aviso = `Usuario creado. Contraseña temporal: ${tempPass} — compártela de forma segura; deberá cambiarla al entrar.`;
  }

  // ¿Ya es miembro de este tenant?
  const { data: yaMiembro } = await admin
    .from("memberships")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (yaMiembro) {
    return { error: "Esa persona ya forma parte del equipo." };
  }

  const { error: insErr } = await admin
    .from("memberships")
    .insert({ tenant_id: tenantId, user_id: userId, rol });
  if (insErr) return { error: `No se pudo añadir: ${insErr.message}` };

  revalidatePath("/panel/team");
  return { ok: true, aviso };
}

export async function cambiarRol(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "team.manage");

  const id = String(formData.get("membershipId") ?? "");
  const parsed = rolSchema.safeParse(formData.get("rol"));
  if (!parsed.success) return { error: "Rol no válido" };

  const supabase = await createSupabaseServerClient();
  // Comprobamos que el membership pertenece al tenant activo (defensa en profundidad
  // además de RLS) y que no es uno mismo degradándose.
  const { data: m } = await supabase
    .from("memberships")
    .select("id, user_id, tenant_id")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.tenant_id !== ctx.currentTenant.id) return { error: "Miembro no válido" };
  if (m.user_id === ctx.userId && !ctx.isPlatformAdmin) {
    return { error: "No puedes cambiar tu propio rol." };
  }

  const { error } = await supabase
    .from("memberships")
    .update({ rol: parsed.data })
    .eq("id", id);
  if (error) return { error: `No se pudo actualizar: ${error.message}` };

  revalidatePath("/panel/team");
  return { ok: true };
}

export async function eliminarMiembro(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "team.manage");

  const id = String(formData.get("membershipId") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data: m } = await supabase
    .from("memberships")
    .select("id, user_id, tenant_id")
    .eq("id", id)
    .maybeSingle();
  if (!m || m.tenant_id !== ctx.currentTenant.id) return { error: "Miembro no válido" };
  if (m.user_id === ctx.userId && !ctx.isPlatformAdmin) {
    return { error: "No puedes quitarte a ti mismo del equipo." };
  }

  const { error } = await supabase.from("memberships").delete().eq("id", id);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };

  revalidatePath("/panel/team");
  return { ok: true };
}
