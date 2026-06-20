"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchRecibo } from "@/lib/recibo";
import { leerConfigEntrega } from "./config";
import { adaptadorDe } from "./registry";
import { renderComprobante, type DatosComprobante, type ProveedorMsg } from "./render";
import { formatearImporte } from "@/components/kiosk/format";
import {
  enviarComprobanteSchema,
  validarDestino,
  canalHabilitado,
  superaTopes,
  dentroDeVentana,
} from "./validate";

export interface ResultadoComprobante {
  ok: boolean;
  error?: string;
}

// Envía (o registra, en print) el comprobante de un pedido por un canal.
// Seguridad: exige pedido PAGADO y reciente, valida el destino, comprueba que
// el canal esté habilitado para el tenant y aplica topes anti-abuso. Todo el
// trabajo ocurre en el servidor; el cliente solo aporta token, canal y destino.
export async function enviarComprobante(
  input: unknown
): Promise<ResultadoComprobante> {
  const parsed = enviarComprobanteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos de envío no válidos." };
  }
  const { reciboToken, canal } = parsed.data;

  // Validar el destino según el canal (PII mínima, formato correcto).
  const destinoVal = validarDestino(canal, parsed.data.destino ?? null);
  if (!destinoVal.ok) return { ok: false, error: destinoVal.error };
  const destino = destinoVal.valor;

  const supabase = createSupabaseAdminClient();

  // Resolver el pedido por su recibo_token (no exponemos el id interno).
  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, tenant_id, estado, paid_at, importe_total, moneda, idioma")
    .eq("recibo_token", reciboToken)
    .maybeSingle();
  if (errOrder) {
    return { ok: false, error: "No se pudo leer el pedido." };
  }
  if (!order || order.estado !== "paid") {
    return { ok: false, error: "El pedido no está disponible para envío." };
  }
  if (!dentroDeVentana(order.paid_at)) {
    return { ok: false, error: "La ventana de envío ha expirado." };
  }

  // Canal habilitado para el tenant + identidades de remitente.
  const cfg = await leerConfigEntrega(order.tenant_id);
  if (!canalHabilitado(cfg.canales, canal)) {
    return { ok: false, error: "Canal no disponible." };
  }

  // Topes anti-abuso: total por pedido y por canal.
  const { count: totalEnvios } = await supabase
    .from("order_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const { count: enviosCanal } = await supabase
    .from("order_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id)
    .eq("canal", canal);
  if (superaTopes(totalEnvios ?? 0, enviosCanal ?? 0)) {
    return { ok: false, error: "Se alcanzó el máximo de envíos para este pedido." };
  }

  // Renderizar el mensaje con el detalle completo (mismo origen de datos que la
  // página pública: la RPC get_recibo). Si por algún motivo no hay recibo,
  // caemos a un resumen mínimo.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const lang = order.idioma ?? "es";
  const url = `${appUrl}/r/${reciboToken}`;
  const recibo = await fetchRecibo(reciboToken);

  const fmt = (n: number) => formatearImporte(n, order.moneda, lang);
  const tenantNombre = recibo?.tenant.nombre ?? (await nombreTenant(supabase, order.tenant_id));

  const proveedores: ProveedorMsg[] = (recibo?.proveedores ?? []).map((p) => ({
    emisor: p.emisor.razon_social || p.nombre,
    nif: p.emisor.nif ?? null,
    facturaRef: p.factura?.referencia ?? null,
    lineas: p.items.map((it) => ({
      titulo: it.titulo,
      cantidad: it.cantidad,
      importeFmt: fmt(it.importe),
      ivaTipo: it.iva_tipo,
    })),
    baseFmt: p.factura ? fmt(p.factura.base_imponible) : null,
    desglose: (p.factura?.desglose_iva ?? []).map((d) => ({
      tipo: d.tipo,
      cuotaFmt: fmt(d.cuota),
    })),
    totalFmt: p.factura ? fmt(p.factura.total) : null,
    soporteEmail: p.soporte.email ?? null,
    soporteTelefono: p.soporte.telefono ?? null,
    cancelacion: localizar(p.cancelacion, lang),
    terminosUrl: p.terminos_url ?? null,
    privacidadUrl: p.privacidad_url ?? null,
  }));

  // Reply-To: soporte del tenant o, en su defecto, del primer proveedor.
  const replyTo =
    (recibo?.legal?.soporte_email as string | undefined) ??
    proveedores.find((p) => p.soporteEmail)?.soporteEmail ??
    null;

  const datos: DatosComprobante = {
    tenantNombre,
    url,
    referencia: recibo?.referencia ?? null,
    totalFormateado: fmt(Number(order.importe_total)),
    lang,
    proveedores,
    replyTo,
  };
  const comprobante = renderComprobante(datos);

  // Registrar la entrega como pending (PII de destino solo aquí).
  const { data: delivery, error: errDel } = await supabase
    .from("order_deliveries")
    .insert({ order_id: order.id, canal, destino, estado: "pending" })
    .select("id")
    .single();
  if (errDel || !delivery) {
    return { ok: false, error: "No se pudo registrar la entrega." };
  }

  // Enviar por el adaptador del canal y actualizar el estado.
  const resultado = await adaptadorDe(canal).enviar(comprobante, destino, cfg.remitente);
  await supabase
    .from("order_deliveries")
    .update({
      estado: resultado.ok ? "sent" : "failed",
      proveedor_msg_id: resultado.proveedorMsgId ?? null,
      error: resultado.ok ? null : resultado.error ?? "Error desconocido.",
    })
    .eq("id", delivery.id);

  if (!resultado.ok) {
    return { ok: false, error: resultado.error ?? "No se pudo enviar el comprobante." };
  }
  return { ok: true };
}

// Resuelve un texto {es,en} o cadena simple por idioma.
function localizar(
  val: string | Record<string, string> | null | undefined,
  lang: string
): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val[lang] ?? val.es ?? val.en ?? null;
}

async function nombreTenant(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tenantId: string
): Promise<string> {
  const { data } = await supabase
    .from("tenants")
    .select("nombre")
    .eq("id", tenantId)
    .single();
  return data?.nombre ?? "Concierge";
}
