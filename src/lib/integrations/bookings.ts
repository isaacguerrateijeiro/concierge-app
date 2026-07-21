import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolverAdapter } from "./index";
import type { LineaReserva } from "./types";

// ============================================================
// Confirmación de reserva tras el pago.
// Agrupa las líneas del pedido por proveedor, resuelve su adaptador
// (stock local o API real) y formaliza la reserva. Idempotente por
// (order_id, provider_id) mediante la tabla order_bookings: un proveedor
// ya confirmado nunca se vuelve a reservar.
// ============================================================

export interface ResultadoReservas {
  confirmadas: number;
  fallidas: number;
}

export async function confirmarReservasPedido(
  orderId: string
): Promise<ResultadoReservas> {
  const supabase = createSupabaseAdminClient();
  const resultado: ResultadoReservas = { confirmadas: 0, fallidas: 0 };

  // 1) El pedido debe estar pagado.
  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, estado")
    .eq("id", orderId)
    .single();
  if (errOrder || !order) {
    throw new Error(`Pedido no encontrado: ${errOrder?.message ?? orderId}`);
  }
  if (order.estado !== "paid") return resultado;

  // 2) Líneas del pedido con servicio, fecha y cantidad.
  const { data: items, error: errItems } = await supabase
    .from("order_items")
    .select("id, service_id, service_slug, titulo, cantidad, fecha_servicio")
    .eq("order_id", orderId);
  if (errItems) {
    throw new Error(`No se pudieron leer las líneas: ${errItems.message}`);
  }
  if (!items || items.length === 0) return resultado;

  // 3) service_id -> provider_id + config de integración.
  const serviceIds = Array.from(
    new Set(items.map((i) => i.service_id).filter((x): x is string => !!x))
  );
  if (serviceIds.length === 0) return resultado;

  const { data: servicios, error: errServ } = await supabase
    .from("services")
    .select("id, provider_id")
    .in("id", serviceIds);
  if (errServ) {
    throw new Error(`No se pudieron leer los servicios: ${errServ.message}`);
  }
  const providerDeServicio = new Map(
    (servicios ?? []).map((s) => [s.id, s.provider_id])
  );

  // 4) Agrupar líneas por proveedor.
  const lineasPorProvider = new Map<string, LineaReserva[]>();
  for (const it of items) {
    if (!it.service_id) continue;
    const providerId = providerDeServicio.get(it.service_id);
    if (!providerId) continue;
    if (!lineasPorProvider.has(providerId)) lineasPorProvider.set(providerId, []);
    lineasPorProvider.get(providerId)!.push({
      serviceId: it.service_id,
      serviceSlug: it.service_slug ?? "",
      titulo: it.titulo ?? it.service_slug ?? "",
      fecha: it.fecha_servicio,
      cantidad: it.cantidad,
    });
  }
  if (lineasPorProvider.size === 0) return resultado;

  // 5) Config de integración de los proveedores implicados.
  const providerIds = Array.from(lineasPorProvider.keys());
  const { data: providers, error: errProv } = await supabase
    .from("providers")
    .select("id, integracion_config")
    .in("id", providerIds);
  if (errProv) {
    throw new Error(`No se pudieron leer los proveedores: ${errProv.message}`);
  }
  const configPorProvider = new Map(
    (providers ?? []).map((p) => [p.id, p.integracion_config])
  );

  // 6) Una confirmación por proveedor (idempotente).
  for (const [providerId, lineas] of lineasPorProvider.entries()) {
    // Si ya está confirmada, no repetir (evita doble descuento de stock).
    const { data: existente } = await supabase
      .from("order_bookings")
      .select("estado")
      .eq("order_id", orderId)
      .eq("provider_id", providerId)
      .maybeSingle();
    if (existente?.estado === "confirmed") {
      resultado.confirmadas += 1;
      continue;
    }

    const adapter = resolverAdapter(configPorProvider.get(providerId));
    let res;
    try {
      res = await adapter.confirmarReserva(lineas);
    } catch (e) {
      res = {
        ok: false,
        referenciaExterna: null,
        error: e instanceof Error ? e.message : "Error al confirmar la reserva.",
      };
    }

    await upsertBooking(supabase, {
      order_id: orderId,
      provider_id: providerId,
      estado: res.ok ? "confirmed" : "failed",
      adaptador: adapter.tipo,
      referencia_externa: res.referenciaExterna,
      error: res.error,
    });

    if (res.ok) resultado.confirmadas += 1;
    else resultado.fallidas += 1;
  }

  return resultado;
}

type BookingUpsert = {
  order_id: string;
  provider_id: string;
  estado: "pending" | "confirmed" | "failed";
  adaptador: string | null;
  referencia_externa: string | null;
  error: string | null;
};

async function upsertBooking(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  row: BookingUpsert
): Promise<void> {
  const { error } = await supabase
    .from("order_bookings")
    .upsert(
      { ...row, updated_at: new Date().toISOString() },
      { onConflict: "order_id,provider_id" }
    );
  if (error) {
    throw new Error(`No se pudo registrar la reserva: ${error.message}`);
  }
}
