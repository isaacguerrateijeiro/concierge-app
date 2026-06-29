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

// Importe mínimo cobrable por Stripe (50 céntimos).
const IMPORTE_MINIMO = 0.5;

export interface ResultadoCheckout {
  clientSecret: string;
  orderId: string;
}

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
    .select("id, stripe_payouts_activos")
    .in("id", providerIdsCarrito);
  if (errProv) {
    throw new Error(`No se pudieron leer los proveedores: ${errProv.message}`);
  }
  const payoutReady = new Map(
    (provs ?? []).map((p) => [p.id, p.stripe_payouts_activos])
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
    if (!payoutReady.get(s.provider_id)) {
      throw new Error(
        `El servicio '${item.service_slug}' no está disponible para pago en este momento.`
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
  if (importeTotal < IMPORTE_MINIMO) {
    throw new Error(
      `El importe total (${importeTotal} ${moneda}) es menor que el mínimo cobrable.`
    );
  }

  // 6) Crear el pedido (pending) + líneas + comisiones
  const { data: pedido, error: errPedido } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenant.id,
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

  // 7) Crear la sesión de pago de Stripe (Embedded Checkout)
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

  return { clientSecret: session.client_secret, orderId: pedido.id };
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
