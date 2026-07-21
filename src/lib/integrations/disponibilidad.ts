"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolverAdapter } from "./index";
import type { Disponibilidad } from "./types";

// Ventana de días que el calendario del kiosko consulta por adelantado.
const VENTANA_DIAS = 90;

function isoDia(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Server Action del kiosko: dado el slug de un servicio, resuelve el adaptador
// de su proveedor (local / bigbus) y devuelve la disponibilidad por fecha para
// los próximos VENTANA_DIAS días. El calendario usa el resultado para marcar
// los días agotados. Ante cualquier problema devuelve {} (sin bloqueos).
export async function consultarDisponibilidad(
  serviceSlug: string
): Promise<Disponibilidad> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: svc } = await supabase
      .from("services")
      .select("id, providers(integracion_config)")
      .eq("slug", serviceSlug)
      .maybeSingle();
    if (!svc) return { capacidadDiaria: null, dias: {} };

    const prov = svc.providers as { integracion_config: unknown } | null;
    const adapter = resolverAdapter(prov?.integracion_config);

    const hoy = new Date();
    const desde = isoDia(hoy);
    const hasta = isoDia(new Date(hoy.getTime() + VENTANA_DIAS * 86400000));

    return await adapter.consultarDisponibilidad(serviceSlug, desde, hasta);
  } catch {
    return { capacidadDiaria: null, dias: {} };
  }
}
