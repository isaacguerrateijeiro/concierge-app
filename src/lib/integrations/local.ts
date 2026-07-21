import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ProviderAdapter,
  Disponibilidad,
  MapaDisponibilidad,
  LineaReserva,
  ResultadoReserva,
} from "./types";

// Motor de stock LOCAL. La disponibilidad y la reserva se resuelven contra
// las tablas internas (service_availability) mediante los RPC get_disponibilidad
// y reservar_stock. Es el adaptador por defecto para cualquier proveedor sin
// integración externa configurada.
export class LocalStockAdapter implements ProviderAdapter {
  readonly tipo = "local";

  async consultarDisponibilidad(
    serviceSlug: string,
    desde: string,
    hasta: string
  ): Promise<Disponibilidad> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_disponibilidad", {
      p_service_slug: serviceSlug,
      p_desde: desde,
      p_hasta: hasta,
    });
    if (error) {
      throw new Error(`No se pudo consultar disponibilidad: ${error.message}`);
    }
    const raw = data as unknown as {
      capacidad_diaria: number | null;
      dias: MapaDisponibilidad;
    } | null;
    return {
      capacidadDiaria: raw?.capacidad_diaria ?? null,
      dias: raw?.dias ?? {},
    };
  }

  async confirmarReserva(lineas: LineaReserva[]): Promise<ResultadoReserva> {
    const supabase = createSupabaseAdminClient();
    for (const l of lineas) {
      if (!l.fecha || l.cantidad <= 0) continue;
      const { data, error } = await supabase.rpc("reservar_stock", {
        p_service_id: l.serviceId,
        p_fecha: l.fecha,
        p_cantidad: l.cantidad,
      });
      if (error) {
        return {
          ok: false,
          referenciaExterna: null,
          error: `No se pudo reservar stock de '${l.serviceSlug}': ${error.message}`,
        };
      }
      if (data === false) {
        return {
          ok: false,
          referenciaExterna: null,
          error: `Sin disponibilidad para '${l.serviceSlug}' el ${l.fecha}.`,
        };
      }
    }
    // El stock local no emite localizador externo: la reserva queda registrada
    // en service_availability y confirmada en order_bookings.
    return { ok: true, referenciaExterna: null, error: null };
  }
}
