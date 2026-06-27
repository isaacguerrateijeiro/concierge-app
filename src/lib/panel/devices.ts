import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Localized } from "@/lib/catalog.schema";

export interface Kiosko {
  id: string;
  nombre: string;
  tipoI18n: Localized;
  orden: number;
  activo: boolean;
  pedidos: number;
  ultimoPedido: string | null;
}

export async function listarKioskos(tenantId: string): Promise<Kiosko[]> {
  const supabase = await createSupabaseServerClient();
  const { data: locs, error } = await supabase
    .from("locations")
    .select("id, nombre, tipo_i18n, orden, activo")
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`listarKioskos: ${error.message}`);

  const { data: ords } = await supabase
    .from("orders")
    .select("location_id, created_at, estado")
    .eq("tenant_id", tenantId)
    .eq("estado", "paid");

  const agg = new Map<string, { pedidos: number; ultimo: string | null }>();
  for (const o of ords ?? []) {
    if (!o.location_id) continue;
    const a = agg.get(o.location_id) ?? { pedidos: 0, ultimo: null };
    a.pedidos += 1;
    if (!a.ultimo || o.created_at > a.ultimo) a.ultimo = o.created_at;
    agg.set(o.location_id, a);
  }

  return (locs ?? []).map((l) => {
    const a = agg.get(l.id);
    return {
      id: l.id,
      nombre: l.nombre,
      tipoI18n: (l.tipo_i18n as Localized) ?? {},
      orden: l.orden,
      activo: l.activo,
      pedidos: a?.pedidos ?? 0,
      ultimoPedido: a?.ultimo ?? null,
    };
  });
}

export async function getKiosko(tenantId: string, id: string): Promise<Kiosko | null> {
  const supabase = await createSupabaseServerClient();
  const { data: l } = await supabase
    .from("locations")
    .select("id, nombre, tipo_i18n, orden, activo")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (!l) return null;
  return {
    id: l.id,
    nombre: l.nombre,
    tipoI18n: (l.tipo_i18n as Localized) ?? {},
    orden: l.orden,
    activo: l.activo,
    pedidos: 0,
    ultimoPedido: null,
  };
}
