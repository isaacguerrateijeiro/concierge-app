import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import { calcularTotalesIva, type LineaIva } from "./iva";

// ============================================================
// Emision de facturas simplificadas tras el pago.
//  - Agrupa las lineas del pedido por proveedor (cada proveedor es el emisor
//    en el modelo marketplace).
//  - Por cada emisor con importe > 0 emite UNA factura: asigna numero
//    correlativo de su serie (RPC con bloqueo) y guarda un SNAPSHOT fiscal
//    inmutable (emisor, base, cuota, total, desglose de IVA).
// Idempotente: order_invoices tiene UNIQUE(order_id, provider_id); si ya hay
// factura para ese (pedido, proveedor) no se vuelve a emitir.
// Se invoca desde el webhook tras marcar el pedido como "paid".
// ============================================================

export interface ResultadoFacturas {
  emitidas: number;
  existentes: number;
}

interface EmisorSnapshot {
  razon_social: string;
  nif: string;
  domicilio: string;
}

function texto(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function emitirFacturasPedido(
  orderId: string
): Promise<ResultadoFacturas> {
  const supabase = createSupabaseAdminClient();

  // 1) Pedido pagado.
  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, estado, moneda, tenant_id")
    .eq("id", orderId)
    .single();
  if (errOrder || !order) {
    throw new Error(`Pedido no encontrado: ${errOrder?.message ?? orderId}`);
  }
  if (order.estado !== "paid") {
    throw new Error(`El pedido ${orderId} no está pagado; no se emiten facturas.`);
  }

  // 2) Datos legales del tenant (respaldo de emisor y soporte).
  const { data: tenant } = await supabase
    .from("tenants")
    .select("legal_config")
    .eq("id", order.tenant_id)
    .single();
  const legal = (tenant?.legal_config ?? {}) as Record<string, unknown>;

  // 3) Lineas del pedido con su tipo de IVA.
  const { data: items, error: errItems } = await supabase
    .from("order_items")
    .select("id, service_id, importe, iva_tipo")
    .eq("order_id", orderId);
  if (errItems) {
    throw new Error(`No se pudieron leer las líneas: ${errItems.message}`);
  }
  const resultado: ResultadoFacturas = { emitidas: 0, existentes: 0 };
  if (!items || items.length === 0) return resultado;

  // 4) service_id -> provider_id.
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

  // 5) Agrupar lineas por proveedor.
  const lineasPorProveedor = new Map<string, LineaIva[]>();
  for (const it of items) {
    const providerId = it.service_id
      ? providerDeServicio.get(it.service_id)
      : undefined;
    if (!providerId) continue; // linea sin emisor: no facturable.
    const arr = lineasPorProveedor.get(providerId) ?? [];
    arr.push({ importe: Number(it.importe), iva_tipo: Number(it.iva_tipo) });
    lineasPorProveedor.set(providerId, arr);
  }
  if (lineasPorProveedor.size === 0) return resultado;

  const providerIds = Array.from(lineasPorProveedor.keys());

  // 6) fiscal_config de cada proveedor + facturas ya existentes (idempotencia).
  const { data: provs } = await supabase
    .from("providers")
    .select("id, slug, nombre, fiscal_config")
    .in("id", providerIds);
  const provInfo = new Map(
    (provs ?? []).map((p) => [p.id, p])
  );

  const { data: existentes } = await supabase
    .from("order_invoices")
    .select("provider_id")
    .eq("order_id", orderId);
  const yaFacturado = new Set((existentes ?? []).map((f) => f.provider_id));

  const anio = new Date().getFullYear();
  const moneda = order.moneda ?? "EUR";

  for (const [providerId, lineas] of lineasPorProveedor) {
    if (yaFacturado.has(providerId)) {
      resultado.existentes += 1;
      continue;
    }
    const totales = calcularTotalesIva(lineas);
    if (totales.total <= 0) continue; // solo emisores con importe > 0.

    const prov = provInfo.get(providerId);
    const fc = (prov?.fiscal_config ?? {}) as Record<string, unknown>;

    const serie = texto(fc.serie) || (prov?.slug ?? "FAC").toUpperCase();
    const emisor: EmisorSnapshot = {
      razon_social:
        texto(fc.razon_social) ||
        texto(legal.razon_social) ||
        (prov?.nombre ?? ""),
      nif: texto(fc.nif) || texto(legal.nif),
      domicilio: texto(fc.domicilio) || texto(legal.domicilio),
    };

    // Numero correlativo (atomico, sin huecos) por proveedor/serie/anio.
    const { data: numero, error: errNum } = await supabase.rpc(
      "siguiente_numero_factura",
      { p_provider_id: providerId, p_serie: serie, p_anio: anio }
    );
    if (errNum || typeof numero !== "number") {
      throw new Error(
        `No se pudo asignar número de factura: ${errNum?.message ?? "desconocido"}`
      );
    }

    const { error: errIns } = await supabase.from("order_invoices").insert({
      order_id: orderId,
      provider_id: providerId,
      serie,
      anio,
      numero,
      emisor: emisor as unknown as Json,
      moneda,
      base_imponible: totales.base_imponible,
      cuota_iva: totales.cuota_iva,
      total: totales.total,
      desglose_iva: totales.desglose_iva as unknown as Json,
    });
    if (errIns) {
      // Carrera: otra entrega del webhook ya inserto esta factura. No es error.
      if (errIns.code === "23505") {
        resultado.existentes += 1;
        continue;
      }
      throw new Error(`No se pudo emitir la factura: ${errIns.message}`);
    }
    resultado.emitidas += 1;
  }

  return resultado;
}
