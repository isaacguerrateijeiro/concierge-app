import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/auth/roles";

export interface Miembro {
  membershipId: string;
  userId: string;
  nombre: string;
  email: string;
  rol: Rol;
  esYo: boolean;
  desde: string;
}

export async function listarMiembros(
  tenantId: string,
  miUserId: string
): Promise<Miembro[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("id, user_id, rol, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listarMiembros: ${error.message}`);

  const userIds = (data ?? []).map((m) => m.user_id);
  // No hay FK memberships->profiles (ambas referencian auth.users), asi que
  // resolvemos los perfiles en una consulta aparte. RLS permite ver co-miembros.
  const perfiles = new Map<string, { nombre: string | null; email: string | null }>();
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nombre, email")
      .in("id", userIds);
    for (const p of profs ?? []) perfiles.set(p.id, { nombre: p.nombre, email: p.email });
  }

  return (data ?? []).map((m) => {
    const p = perfiles.get(m.user_id);
    return {
      membershipId: m.id,
      userId: m.user_id,
      nombre: p?.nombre ?? p?.email ?? "—",
      email: p?.email ?? "—",
      rol: m.rol as Rol,
      esYo: m.user_id === miUserId,
      desde: m.created_at,
    };
  });
}
