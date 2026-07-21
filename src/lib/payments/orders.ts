"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { tx, type Localized } from "@/lib/catalog.schema";
import {
  calcularComisionesLinea,
  redondear2,
  type ReglaComision,
  type Beneficiario,
  type TipoCalculo,
} from "./commissions";
import { cartSchema } from "./cart.schema";
import { generarReferencia } from "@/lib/vouchers/codigo";
import { resolverAdapter } from "@/lib/integrations";
import { generarVouchersPedido } from "@/lib/vouchers/vouchers";
import { confirmarReservasPedido } from "@/lib/integrations/bookings";

// Importe mínimo cobrable por Stripe (50 céntimos).
const IMPORTE_MINIMO = 0.5;

// Resultado del checkout: o bien una sesión de pago de Stripe (Embedded
// Checkout), o bien una reserva gratuita ya confirmada sin pasar por Stripe.
// En ambos casos hay un sessionId con el que la pantalla de confirmación
// consulta el estado del pedido (get_order_status).
export type ResultadoCheckout =
  | { tipo: "pago"; clientSecret: string; sessionId: string; orderId: string }
  | { tipo: "gratis"; sessionId: string; orderId: string };

export interface EstadoPedido {
  estado: "pending" | "paid" | "failed" | "expired";
  importe_total: number;
  moneda: string;
  recibo_token: string | null;
}

// Crea el pedido y la sesión de pago de Stripe (Embedded Checkout) para un
// carrito. TODO el cálculo de precios y comisiones ocurre aquí, en el servidor,
// leyendo de la base de datos: el cliente solo dice qué servicios, cuántos,
// para qué fecha y qué tipos de pasajero.
export async function crearCheckoutParaCarrito(
  cartInput: unknown,
  idiomaInput?: string
): Promise<ResultadoCheckout> {
  const cart = cartSchema.parse(cartInput);
  const tenantSlug = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "prosegur";

  const supabase = createSupabaseAdminClient();

  // 1) Tenant
  const { data: tenant, error: errTenant } = await supabase
    .from("tenants")
    .select("id, locale_default, legal_config")
    .eq("slug", tenantSlug)
    .eq("activo", true)
    .single();
  if (errTenant || !tenant) {
    throw new Error(`Tenant '${tenantSlug}' no encontrado.`);
  }
  const idioma = idiomaInput ?? tenant.locale_default;
  const legalTenant = (tenant.legal_config ?? {}) as Record<string, unknown>;
  const ivaDefault =
    typeof legalTenant.iva_default === "number" ? legalTenant.iva_default : 21;

  // 2) Servicios del carrito (deben ser del tenant, activos e integrados)
  const slugs = [...new Set(cart.items.map((i) => i.service_slug))];
  const { data: servicios, error: errServ } = await supabase
    .from("services")
    .select(
      "id, slug, titulo_i18n, precio_desde, moneda, tipo_pago, provider_id, activo, iva_tipo"
    )
    .eq("tenant_id", tenant.id)
    .in("slug", slugs);
  if (errServ) {
    throw new Error(`No se pudieron leer los servicios: ${errServ.message}`);
  }

  // Verificar que los proveedores pueden recibir pagos (Stripe Connect activo)
  const providerIdsCarrito = Array.from(
    new Set((servicios ?? []).map((s) => s.provider_id))
  );
  const { data: provs, error: errProv } = await supabase
    .from("providers")
    .select("id, stripe_payouts_activos, integracion_config")
    .in("id", providerIdsCarrito);
  if (errProv) {
    throw new Error(`No se pudieron leer los proveedores: ${errProv.message}`);
  }
  const payoutReady = new Map(
    (provs ?? []).map((p) => [p.id, p.stripe_payouts_activos])
  );
  const integracionPorProvider = new Map(
    (provs ?? []).map((p) => [p.id, p.integracion_config])
  );

  const porSlug = new Map((servicios ?? []).map((s) => [s.slug, s]));
  for (const item of cart.items) {
    const s = porSlug.get(item.service_slug);
    if (!s) throw new Error(`El servicio '${item.service_slug}' no existe.`);
    if (!s.activo)
      throw new Error(`El servicio '${item.service_slug}' no está disponible.`);
    if (s.tipo_pago !== "integrado") {
      throw new Error(
        `El servicio '${item.service_slug}' no se paga en el kiosko.`
      );
    }
    // El guard de Stripe Connect (payouts) se aplica más abajo, solo a los
    // proveedores con líneas de importe > 0: un servicio gratuito (free tour)
    // no requiere cuenta conectada porque no hay cobro ni reparto.
  }

  // 2b) Guard de disponibilidad: para las líneas con fecha, revalidamos contra
  //     el adaptador del proveedor (stock local o API real) que quede stock
  //     suficiente. La reserva efectiva se hace tras el pago (webhook), no aquí,
  //     para no bloquear plazas en carritos abandonados.
  for (const item of cart.items) {
    if (!item.fecha) continue;
    const s = porSlug.get(item.service_slug)!;
    const requerido = item.pasajeros
      ? item.pasajeros.reduce((acc, p) => acc + p.cantidad, 0)
      : item.cantidad ?? 0;
    if (requerido <= 0) continue;

    const adapter = resolverAdapter(integracionPorProvider.get(s.provider_id));
    const disp = await adapter.consultarDisponibilidad(
      item.service_slug,
      item.fecha,
      item.fecha
    );
    const info = disp.dias[item.fecha];
    // Plazas restantes: excepción por fecha si existe; si no, la capacidad
    // diaria por defecto; null = sin límite.
    const restante = info
      ? info.agotado
        ? 0
        : info.restante
      : disp.capacidadDiaria;
    if (restante !== null && requerido > restante) {
      throw new Error(
        `Ya no hay disponibilidad suficiente para '${item.service_slug}' el ${item.fecha}.`
      );
    }
  }

  // 3) Tarifas por tipo de pasajero (para servicios que las tienen)
  const serviceIds = (servicios ?? []).map((s) => s.id);
  const { data: tiersData } = await supabase
    .from("service_price_tiers")
    .select("service_id, tipo, label_i18n, precio")
    .in("service_id", serviceIds)
    .eq("activo", true);

  // Map: serviceId -> Map<tipo, { precio, label_i18n }>
  type TierInfo = { precio: number; label_i18n: Record<string, string> };
  const tiersPorServicio = new Map<string, Map<string, TierInfo>>();
  for (const t of tiersData ?? []) {
    if (!tiersPorServicio.has(t.service_id)) {
      tiersPorServicio.set(t.service_id, new Map());
    }
    tiersPorServicio.get(t.service_id)!.set(t.tipo, {
      precio: Number(t.precio),
      label_i18n: (t.label_i18n as Record<string, string>) ?? {},
    });
  }

  // 4) Reglas de comisión aplicables (por proveedor o por servicio)
  const providerIds = Array.from(
    new Set((servicios ?? []).map((s) => s.provider_id))
  );
  const { data: reglas, error: errReglas } = await supabase
    .from("commission_rules")
    .select("beneficiario, ambito, tipo_calculo, valor, provider_id, service_id")
    .eq("tenant_id", tenant.id)
    .eq("activo", true)
    .or(
      `provider_id.in.(${providerIds.join(",")}),service_id.in.(${serviceIds.join(",")})`
    );
  if (errReglas) {
    throw new Error(`No se pudieron leer las comisiones: ${errReglas.message}`);
  }

  // 5) Construir líneas calculadas
  //    - Servicios con tarifas: una LineaCalculada por tipo de pasajero
  //    - Servicios simples:     una LineaCalculada con precio_desde × cantidad
  const moneda = (servicios?.[0]?.moneda ?? "EUR").toUpperCase();
  type LineaCalculada = {
    service_id: string;
    service_slug: string;
    titulo: string;
    precio_unitario: number;
    cantidad: number;
    importe: number;
    iva_tipo: number;
    fecha_servicio: string | null;
    variant_tipo: string | null;
    variant_label: string | null;
    comisiones: ReturnType<typeof calcularComisionesLinea>;
  };

  const lineas: LineaCalculada[] = [];

  for (const item of cart.items) {
    const s = porSlug.get(item.service_slug)!;
    const iva_tipo =
      s.iva_tipo !== null ? Number(s.iva_tipo) : ivaDefault;
    const reglasLinea: ReglaComision[] = (reglas ?? [])
      .filter((r) => r.provider_id === s.provider_id || r.service_id === s.id)
      .map((r) => ({
        beneficiario: r.beneficiario as Beneficiario,
        ambito: r.ambito as "proveedor" | "servicio",
        tipo_calculo: r.tipo_calculo as TipoCalculo,
        valor: Number(r.valor),
      }));

    const tituloBase = tx(s.titulo_i18n as Localized, idioma);
    const tiers = tiersPorServicio.get(s.id);
    const fecha = item.fecha ?? null;

    if (item.pasajeros && tiers && tiers.size > 0) {
      // Servicio con tarifas variables: una línea por tipo de pasajero
      for (const pax of item.pasajeros) {
        if (pax.cantidad <= 0) continue;
        const tierInfo = tiers.get(pax.tipo);
        if (!tierInfo) {
          throw new Error(
            `El tipo de pasajero '${pax.tipo}' no existe para '${item.service_slug}'.`
          );
        }
        const precio_unitario = tierInfo.precio;
        const labelPax =
          tierInfo.label_i18n[idioma] ??
          tierInfo.label_i18n["es"] ??
          pax.tipo;
        const importe = redondear2(precio_unitario * pax.cantidad);
        lineas.push({
          service_id: s.id,
          service_slug: s.slug,
          titulo: `${tituloBase} – ${labelPax}`,
          precio_unitario,
          cantidad: pax.cantidad,
          importe,
          iva_tipo,
          fecha_servicio: fecha,
          variant_tipo: pax.tipo,
          variant_label: labelPax,
          comisiones: calcularComisionesLinea({
            precioUnitario: precio_unitario,
            cantidad: pax.cantidad,
            reglas: reglasLinea,
          }),
        });
      }
    } else {
      // Servicio de precio único (sin tarifas variables)
      const cantidad = item.cantidad;
      if (!cantidad || cantidad <= 0) {
        throw new Error(
          `El servicio '${item.service_slug}' necesita una cantidad.`
        );
      }
      if (s.precio_desde === null) {
        throw new Error(
          `El servicio '${item.service_slug}' no tiene precio configurado.`
        );
      }
      const precio_unitario = Number(s.precio_desde);
      const importe = redondear2(precio_unitario * cantidad);
      lineas.push({
        service_id: s.id,
        service_slug: s.slug,
        titulo: tituloBase,
        precio_unitario,
        cantidad,
        importe,
        iva_tipo,
        fecha_servicio: fecha,
        variant_tipo: null,
        variant_label: null,
        comisiones: calcularComisionesLinea({
          precioUnitario: precio_unitario,
          cantidad,
          reglas: reglasLinea,
        }),
      });
    }
  }

  if (lineas.length === 0) {
    throw new Error("El carrito no contiene líneas válidas.");
  }

  const importeTotal = redondear2(
    lineas.reduce((acc, l) => acc + l.importe, 0)
  );

  // Guard de cobro: solo exigimos Stripe Connect (payouts activos) a los
  // proveedores que aportan importe > 0. Los servicios gratuitos no requieren
  // cuenta conectada. Sumamos por proveedor a partir de las líneas.
  const importePorProvider = new Map<string, number>();
  for (const l of lineas) {
    const prov = porSlug.get(l.service_slug)!.provider_id;
    importePorProvider.set(prov, (importePorProvider.get(prov) ?? 0) + l.importe);
  }
  for (const [prov, imp] of importePorProvider) {
    if (imp > 0 && !payoutReady.get(prov)) {
      throw new Error(
        "Uno de los servicios de pago del carrito no está disponible para cobro en este momento."
      );
    }
  }

  // Reserva gratuita: si el total es 0 no hay cobro posible con Stripe (mínimo
  // 0,50 €). Si hay importe pero es menor que el mínimo, es un error.
  const esGratis = importeTotal === 0;
  if (!esGratis && importeTotal < IMPORTE_MINIMO) {
    throw new Error(
      `El importe total (${importeTotal} ${moneda}) es menor que el mínimo cobrable.`
    );
  }

  // 6) Validar kiosko (location) del tenant, si el carrito lo indica.
  // Sin location_id válido el pedido se crea igual (compatibilidad), pero el
  // panel no podrá atribuirlo a un dispositivo físico.
  let locationId: string | null = null;
  if (cart.location_id) {
    const { data: loc } = await supabase
      .from("locations")
      .select("id")
      .eq("id", cart.location_id)
      .eq("tenant_id", tenant.id)
      .eq("activo", true)
      .maybeSingle();
    if (!loc) {
      throw new Error("El kiosko indicado no es válido para este tenant.");
    }
    locationId = loc.id;
  }

  // 7) Crear el pedido (pending) + líneas + comisiones
  const { data: pedido, error: errPedido } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenant.id,
      location_id: locationId,
      estado: "pending",
      moneda,
      importe_total: importeTotal,
      idioma,
      referencia: generarReferencia(),
    })
    .select("id")
    .single();
  if (errPedido || !pedido) {
    throw new Error(`No se pudo crear el pedido: ${errPedido?.message}`);
  }

  for (const l of lineas) {
    const { data: itemRow, error: errItem } = await supabase
      .from("order_items")
      .insert({
        order_id: pedido.id,
        service_id: l.service_id,
        service_slug: l.service_slug,
        titulo: l.titulo,
        precio_unitario: l.precio_unitario,
        cantidad: l.cantidad,
        importe: l.importe,
        iva_tipo: l.iva_tipo,
        fecha_servicio: l.fecha_servicio,
        variant_tipo: l.variant_tipo,
        variant_label: l.variant_label,
      })
      .select("id")
      .single();
    if (errItem || !itemRow) {
      throw new Error(
        `No se pudo crear la línea del pedido: ${errItem?.message}`
      );
    }
    const { error: errCom } = await supabase
      .from("order_commissions")
      .insert(
        l.comisiones.map((c) => ({
          order_item_id: itemRow.id,
          beneficiario: c.beneficiario,
          tipo_calculo: c.tipo_calculo,
          valor: c.valor,
          importe: c.importe,
        }))
      );
    if (errCom) {
      throw new Error(
        `No se pudieron registrar las comisiones: ${errCom.message}`
      );
    }
  }

  // 7a) Reserva gratuita (importe 0): no pasamos por Stripe. Marcamos el pedido
  //     como pagado, generamos el comprobante (voucher/QR) y descontamos stock
  //     al instante. Usamos un id de sesión sintético para que la pantalla de
  //     confirmación consulte el estado con el mismo mecanismo (get_order_status).
  if (esGratis) {
    const sessionId = `free_${pedido.id}`;
    const { error: errFree } = await supabase
      .from("orders")
      .update({
        stripe_checkout_session_id: sessionId,
        estado: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", pedido.id);
    if (errFree) {
      throw new Error(`No se pudo confirmar la reserva gratuita: ${errFree.message}`);
    }
    // Comprobante + reserva de plazas (idempotentes). Facturas/transferencias
    // no aplican a un importe 0.
    await generarVouchersPedido(pedido.id);
    await confirmarReservasPedido(pedido.id);
    return { tipo: "gratis", sessionId, orderId: pedido.id };
  }

  // 7b) Crear la sesión de pago de Stripe (Embedded Checkout)
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    redirect_on_completion: "never",
    line_items: lineas.map((l) => ({
      quantity: l.cantidad,
      price_data: {
        currency: moneda.toLowerCase(),
        unit_amount: Math.round(l.precio_unitario * 100),
        product_data: { name: l.titulo },
      },
    })),
    payment_intent_data: { transfer_group: pedido.id },
    metadata: { order_id: pedido.id },
  });

  if (!session.client_secret) {
    throw new Error("Stripe no devolvió client_secret para el checkout.");
  }

  const { error: errUpd } = await supabase
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", pedido.id);
  if (errUpd) {
    throw new Error(`No se pudo asociar la sesión de pago: ${errUpd.message}`);
  }

  return {
    tipo: "pago",
    clientSecret: session.client_secret,
    sessionId: session.id,
    orderId: pedido.id,
  };
}

// Devuelve el estado del pedido a partir del id de sesión de Stripe.
export async function obtenerEstadoPedido(
  sessionId: string
): Promise<EstadoPedido | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("get_order_status", {
    p_session_id: sessionId,
  });
  if (error) {
    throw new Error(
      `No se pudo consultar el estado del pedido: ${error.message}`
    );
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.estado !== "string") return null;
  return {
    estado: obj.estado as EstadoPedido["estado"],
    importe_total: Number(obj.importe_total ?? 0),
    moneda: String(obj.moneda ?? "EUR"),
    recibo_token:
      typeof obj.recibo_token === "string" ? obj.recibo_token : null,
  };
}
