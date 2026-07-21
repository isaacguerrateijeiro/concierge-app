import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { crearTransferenciasPedido } from "@/lib/payments/transfers";
import { generarVouchersPedido } from "@/lib/vouchers/vouchers";
import { emitirFacturasPedido } from "@/lib/invoices/invoices";
import { confirmarReservasPedido } from "@/lib/integrations/bookings";
import { leerEstadoCuenta } from "@/lib/stripe/connect";

// El webhook es la FUENTE DE VERDAD del resultado del pago: Stripe nos avisa
// aquí cuando una sesión se completa o falla, y nosotros actualizamos el pedido.
// Verificamos la firma para asegurarnos de que el evento viene de Stripe.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Falta STRIPE_WEBHOOK_SECRET." },
      { status: 500 }
    );
  }

  const firma = req.headers.get("stripe-signature");
  if (!firma) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  const cuerpo = await req.text();
  const stripe = getStripe();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(cuerpo, firma, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "firma inválida";
    return NextResponse.json(
      { error: `Firma de webhook no válida: ${msg}` },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  switch (evento.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = evento.data.object as Stripe.Checkout.Session;
      // Solo marcamos pagado si el pago realmente está cobrado.
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        const orderId = await marcarPedido(supabase, session.id, "paid", session.payment_intent);
        // Tras el pago: emitir las facturas simplificadas (una por proveedor),
        // generar el comprobante (vouchers + recibo) y repartir a cada proveedor
        // su parte. Todo idempotente.
        if (orderId) {
          await emitirFacturasPedido(orderId);
          await generarVouchersPedido(orderId);
          await crearTransferenciasPedido(orderId);
          // Formalizar la reserva con cada proveedor y descontar stock
          // (local o API real vía adaptador). Idempotente por pedido/proveedor.
          await confirmarReservasPedido(orderId);
        }
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = evento.data.object as Stripe.Checkout.Session;
      await marcarPedido(supabase, session.id, "failed", session.payment_intent);
      break;
    }
    case "checkout.session.expired": {
      const session = evento.data.object as Stripe.Checkout.Session;
      await marcarPedido(supabase, session.id, "expired", session.payment_intent);
      break;
    }
    default:
      // Eventos de la cuenta conectada de un proveedor: resincronizamos su
      // estado de cobros (best-effort; el alta también se sincroniza al volver
      // del onboarding y con el botón "Sincronizar" del panel).
      if (esEventoDeCuenta(evento.type)) {
        await sincronizarCuentaDesdeEvento(supabase, evento);
      }
      break;
  }

  // Respondemos 200 para que Stripe no reintente.
  return NextResponse.json({ received: true });
}

type EstadoPedido = "paid" | "failed" | "expired";

// Actualiza el pedido por su id de sesión y devuelve su id. Idempotente:
// reaplicar el mismo evento deja el pedido igual.
async function marcarPedido(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sessionId: string,
  estado: EstadoPedido,
  paymentIntent: string | Stripe.PaymentIntent | null
): Promise<string | null> {
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;

  const { data, error } = await supabase
    .from("orders")
    .update({
      estado,
      paid_at: estado === "paid" ? new Date().toISOString() : null,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("stripe_checkout_session_id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    // Lanzamos para devolver 500 y que Stripe reintente el evento.
    throw new Error(`No se pudo actualizar el pedido: ${error.message}`);
  }
  return data?.id ?? null;
}

function esEventoDeCuenta(tipo: string): boolean {
  return tipo.startsWith("account.") || tipo.includes("v2.core.account");
}

// Extrae el id de la cuenta conectada del evento (v1 o v2) y, si lo encuentra,
// relee su estado en Stripe y actualiza el proveedor correspondiente.
async function sincronizarCuentaDesdeEvento(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  evento: Stripe.Event
): Promise<void> {
  const obj = evento.data?.object as { id?: string; object?: string } | undefined;
  let accountId: string | null = null;
  if (obj?.object === "account" && obj.id) {
    accountId = obj.id;
  }
  if (!accountId) {
    const rel = (evento as unknown as { related_object?: { id?: string } })
      .related_object;
    if (rel?.id?.startsWith("acct_")) accountId = rel.id;
  }
  if (!accountId) return;

  const estado = await leerEstadoCuenta(accountId);
  await supabase
    .from("providers")
    .update({
      stripe_payouts_activos: estado.payoutsActivos,
      stripe_onboarding_estado: estado.estado,
    })
    .eq("stripe_account_id", accountId);
}
