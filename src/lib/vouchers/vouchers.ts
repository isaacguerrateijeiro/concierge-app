import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generarCodigo, generarToken } from "./codigo";

// ============================================================
// Generación del comprobante tras el pago.
//  - Asigna un recibo_token al pedido (para la página pública /r/[token]).
//  - Crea un voucher por línea (order_item) con código legible + token.
// Idempotente: order_vouchers.order_item_id es UNIQUE, así que re-ejecutar
// no duplica. Se invoca desde el webhook tras marcar el pedido como "paid".
// ============================================================

export interface ResultadoVouchers {
  reciboToken: string;
  vouchersCreados: number;
  vouchersExistentes: number;
}

export async function generarVouchersPedido(
  orderId: string
): Promise<ResultadoVouchers> {
  const supabase = createSupabaseAdminClient();

  // 1) Pedido: debe estar pagado. Aseguramos recibo_token.
  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, estado, recibo_token")
    .eq("id", orderId)
    .single();
  if (errOrder || !order) {
    throw new Error(`Pedido no encontrado: ${errOrder?.message ?? orderId}`);
  }
  if (order.estado !== "paid") {
    throw new Error(`El pedido ${orderId} no está pagado; no se generan vouchers.`);
  }

  let reciboToken = order.recibo_token;
  if (!reciboToken) {
    reciboToken = generarToken();
    const { error: errTok } = await supabase
      .from("orders")
      .update({ recibo_token: reciboToken })
      .eq("id", orderId)
      // Solo si sigue sin token (evita pisar un token concurrente).
      .is("recibo_token", null);
    if (errTok) {
      throw new Error(`No se pudo asignar recibo_token: ${errTok.message}`);
    }
    // Releer por si otra ejecución concurrente lo fijó primero.
    const { data: refrescado } = await supabase
      .from("orders")
      .select("recibo_token")
      .eq("id", orderId)
      .single();
    reciboToken = refrescado?.recibo_token ?? reciboToken;
  }

  // 2) Líneas del pedido y proveedor de cada servicio.
  const { data: items, error: errItems } = await supabase
    .from("order_items")
    .select("id, service_id")
    .eq("order_id", orderId);
  if (errItems) {
    throw new Error(`No se pudieron leer las líneas: ${errItems.message}`);
  }

  const resultado: ResultadoVouchers = {
    reciboToken,
    vouchersCreados: 0,
    vouchersExistentes: 0,
  };
  if (!items || items.length === 0) return resultado;

  // Vouchers ya existentes (idempotencia): no recrear.
  const { data: existentes, error: errExist } = await supabase
    .from("order_vouchers")
    .select("order_item_id")
    .eq("order_id", orderId);
  if (errExist) {
    throw new Error(`No se pudieron leer los vouchers: ${errExist.message}`);
  }
  const yaTiene = new Set((existentes ?? []).map((v) => v.order_item_id));

  // service_id -> provider_id (para asociar el voucher al proveedor).
  const serviceIds = Array.from(
    new Set(items.map((i) => i.service_id).filter((x): x is string => !!x))
  );
  const providerDeServicio = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: servicios } = await supabase
      .from("services")
      .select("id, provider_id")
      .in("id", serviceIds);
    for (const s of servicios ?? []) {
      providerDeServicio.set(s.id, s.provider_id);
    }
  }

  const nuevos = items
    .filter((it) => !yaTiene.has(it.id))
    .map((it) => ({
      order_id: orderId,
      order_item_id: it.id,
      provider_id: it.service_id
        ? providerDeServicio.get(it.service_id) ?? null
        : null,
      codigo: generarCodigo(),
      token: generarToken(),
    }));

  resultado.vouchersExistentes = items.length - nuevos.length;
  if (nuevos.length === 0) return resultado;

  // upsert ignorando duplicados por order_item_id (idempotente ante carreras).
  const { error: errIns } = await supabase
    .from("order_vouchers")
    .upsert(nuevos, { onConflict: "order_item_id", ignoreDuplicates: true });
  if (errIns) {
    throw new Error(`No se pudieron crear los vouchers: ${errIns.message}`);
  }
  resultado.vouchersCreados = nuevos.length;
  return resultado;
}
