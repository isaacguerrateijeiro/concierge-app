import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { redondear2 } from "./commissions";

// ============================================================
// Reparto real (Separate Charges & Transfers).
// Tras un pago, la plataforma transfiere a cada proveedor su parte
// (suma de order_commissions con beneficiario='proveedor' de sus líneas).
// Idempotente por (order_id, provider_id): nunca se paga dos veces.
// ============================================================

export interface LineaProveedor {
  providerId: string;
  importeProveedor: number;
}

export interface GrupoProveedor {
  providerId: string;
  importe: number;
}

// Función pura: agrupa importes por proveedor y descarta los nulos/negativos.
export function agruparPorProveedor(lineas: LineaProveedor[]): GrupoProveedor[] {
  const acumulado = new Map<string, number>();
  for (const l of lineas) {
    acumulado.set(
      l.providerId,
      (acumulado.get(l.providerId) ?? 0) + l.importeProveedor
    );
  }
  return Array.from(acumulado.entries())
    .map(([providerId, importe]) => ({ providerId, importe: redondear2(importe) }))
    .filter((g) => g.importe > 0);
}

export interface ResultadoTransferencias {
  creadas: number;
  pendientes: number;
  fallidas: number;
}

// Lee las comisiones de proveedor del pedido, agrupa por proveedor y crea
// una transferencia de Stripe por cada proveedor con cuenta lista.
// Es idempotente: se puede reintentar sin duplicar pagos.
export async function crearTransferenciasPedido(
  orderId: string
): Promise<ResultadoTransferencias> {
  const supabase = createSupabaseAdminClient();
  const stripe = getStripe();
  const resultado: ResultadoTransferencias = { creadas: 0, pendientes: 0, fallidas: 0 };

  // 1) Pedido: debe estar pagado y tener payment intent (para el charge).
  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, estado, moneda, stripe_payment_intent_id")
    .eq("id", orderId)
    .single();
  if (errOrder || !order) {
    throw new Error(`Pedido no encontrado: ${errOrder?.message ?? orderId}`);
  }
  if (order.estado !== "paid") return resultado;
  if (!order.stripe_payment_intent_id) {
    throw new Error(`El pedido ${orderId} no tiene payment intent asociado.`);
  }

  // 2) Líneas del pedido y sus comisiones de proveedor.
  const { data: items, error: errItems } = await supabase
    .from("order_items")
    .select("id, service_id")
    .eq("order_id", orderId);
  if (errItems) {
    throw new Error(`No se pudieron leer las líneas: ${errItems.message}`);
  }
  if (!items || items.length === 0) return resultado;

  const itemIds = items.map((i) => i.id);
  const { data: comisiones, error: errCom } = await supabase
    .from("order_commissions")
    .select("order_item_id, importe")
    .eq("beneficiario", "proveedor")
    .in("order_item_id", itemIds);
  if (errCom) {
    throw new Error(`No se pudieron leer las comisiones: ${errCom.message}`);
  }

  // 3) service_id -> provider_id
  const serviceIds = Array.from(
    new Set(items.map((i) => i.service_id).filter((x): x is string => !!x))
  );
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
  const itemAProvider = new Map<string, string>();
  for (const it of items) {
    if (it.service_id) {
      const pid = providerDeServicio.get(it.service_id);
      if (pid) itemAProvider.set(it.id, pid);
    }
  }

  // 4) Construir líneas por proveedor y agrupar.
  const lineas: LineaProveedor[] = [];
  for (const c of comisiones ?? []) {
    const providerId = itemAProvider.get(c.order_item_id);
    if (providerId) {
      lineas.push({ providerId, importeProveedor: Number(c.importe) });
    }
  }
  const grupos = agruparPorProveedor(lineas);
  if (grupos.length === 0) return resultado;

  // 5) Datos de payout de los proveedores implicados.
  const providerIds = grupos.map((g) => g.providerId);
  const { data: providers, error: errProv } = await supabase
    .from("providers")
    .select("id, stripe_account_id, stripe_payouts_activos")
    .in("id", providerIds);
  if (errProv) {
    throw new Error(`No se pudieron leer los proveedores: ${errProv.message}`);
  }
  const datosProvider = new Map(
    (providers ?? []).map((p) => [
      p.id,
      { accountId: p.stripe_account_id, activo: p.stripe_payouts_activos },
    ])
  );

  // 6) Charge de la operación (source_transaction).
  const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id, {
    expand: ["latest_charge"],
  });
  const chargeId =
    typeof pi.latest_charge === "string"
      ? pi.latest_charge
      : pi.latest_charge?.id ?? null;
  if (!chargeId) {
    throw new Error(`No se encontró el charge del pago ${order.stripe_payment_intent_id}.`);
  }

  // 7) Una transferencia por proveedor (idempotente).
  for (const grupo of grupos) {
    const datos = datosProvider.get(grupo.providerId);
    const listo = !!datos?.accountId && datos.activo === true;

    // Estado previo: si ya está pagada, no repetir.
    const { data: existente } = await supabase
      .from("order_transfers")
      .select("estado")
      .eq("order_id", orderId)
      .eq("provider_id", grupo.providerId)
      .maybeSingle();
    if (existente?.estado === "paid") {
      resultado.creadas += 1;
      continue;
    }

    if (!listo) {
      await upsertTransfer(supabase, {
        order_id: orderId,
        provider_id: grupo.providerId,
        stripe_account_id: datos?.accountId ?? null,
        importe: grupo.importe,
        moneda: order.moneda,
        estado: "pending",
        error: "Proveedor sin cuenta de Stripe lista para cobrar.",
      });
      resultado.pendientes += 1;
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(grupo.importe * 100),
          currency: order.moneda.toLowerCase(),
          destination: datos!.accountId!,
          transfer_group: orderId,
          source_transaction: chargeId,
          metadata: { order_id: orderId, provider_id: grupo.providerId },
        },
        { idempotencyKey: `transfer_${orderId}_${grupo.providerId}` }
      );
      await upsertTransfer(supabase, {
        order_id: orderId,
        provider_id: grupo.providerId,
        stripe_account_id: datos!.accountId!,
        importe: grupo.importe,
        moneda: order.moneda,
        estado: "paid",
        stripe_transfer_id: transfer.id,
        error: null,
      });
      resultado.creadas += 1;
    } catch (e) {
      await upsertTransfer(supabase, {
        order_id: orderId,
        provider_id: grupo.providerId,
        stripe_account_id: datos!.accountId!,
        importe: grupo.importe,
        moneda: order.moneda,
        estado: "failed",
        error: e instanceof Error ? e.message : "Error al crear la transferencia.",
      });
      resultado.fallidas += 1;
    }
  }

  return resultado;
}

type TransferUpsert = {
  order_id: string;
  provider_id: string;
  stripe_account_id: string | null;
  importe: number;
  moneda: string;
  estado: "pending" | "paid" | "failed";
  stripe_transfer_id?: string | null;
  error?: string | null;
};

async function upsertTransfer(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  row: TransferUpsert
): Promise<void> {
  const { error } = await supabase
    .from("order_transfers")
    .upsert(row, { onConflict: "order_id,provider_id" });
  if (error) {
    throw new Error(`No se pudo registrar la transferencia: ${error.message}`);
  }
}
