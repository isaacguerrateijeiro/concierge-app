import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
        await marcarPedido(supabase, session.id, "paid", session.payment_intent);
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
      // Otros eventos no nos interesan de momento.
      break;
  }

  // Respondemos 200 para que Stripe no reintente.
  return NextResponse.json({ received: true });
}

type EstadoPedido = "paid" | "failed" | "expired";

// Actualiza el pedido por su id de sesión. Idempotente: reaplicar el mismo
// evento deja el pedido igual.
async function marcarPedido(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  sessionId: string,
  estado: EstadoPedido,
  paymentIntent: string | Stripe.PaymentIntent | null
): Promise<void> {
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;

  const { error } = await supabase
    .from("orders")
    .update({
      estado,
      paid_at: estado === "paid" ? new Date().toISOString() : null,
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("stripe_checkout_session_id", sessionId);

  if (error) {
    // Lanzamos para devolver 500 y que Stripe reintente el evento.
    throw new Error(`No se pudo actualizar el pedido: ${error.message}`);
  }
}
