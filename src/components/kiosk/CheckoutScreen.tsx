"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { Lang } from "./data";
import { useUiText } from "./uiText";
import Icon from "./Icon";
import { crearCheckoutParaCarrito } from "@/lib/payments/orders";
import type { Cart } from "@/lib/payments/cart.schema";

// La promesa de Stripe.js se crea una sola vez (la clave publishable es pública).
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// Pantalla de pago: monta el Embedded Checkout de Stripe dentro del kiosko.
// Con redirect_on_completion: 'never' (fijado en el servidor) el turista nunca
// sale del kiosko; al completar, avisamos al padre con el id de sesión.
export default function CheckoutScreen({
  lang,
  cart,
  onCancel,
  onCompleted,
}: {
  lang: Lang;
  cart: Cart;
  onCancel: () => void;
  onCompleted: (sessionId: string) => void;
}) {
  const t = useUiText();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  // Ref al callback para invocarlo desde el efecto sin añadirlo a las
  // dependencias (evita relanzar la creación del pedido en un re-render).
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  // El carrito y el idioma quedan fijados al montar la pantalla: así el efecto
  // solo se relanza al reintentar y nunca creamos un pedido duplicado por un
  // re-render del kiosko.
  const [cartInicial] = useState(cart);
  const [langInicial] = useState(lang);

  useEffect(() => {
    let activo = true;
    crearCheckoutParaCarrito(cartInicial, langInicial)
      .then((res) => {
        if (!activo) return;
        // Reserva gratuita: el pedido ya queda confirmado en el servidor, así
        // que saltamos el Embedded Checkout y vamos directos a la confirmación.
        if (res.tipo === "gratis") {
          onCompletedRef.current(res.sessionId);
          return;
        }
        sessionIdRef.current = res.sessionId;
        setClientSecret(res.clientSecret);
      })
      .catch((e: unknown) => {
        if (!activo) return;
        setError(e instanceof Error ? e.message : "error");
      });
    return () => {
      activo = false;
    };
  }, [intento, cartInicial, langInicial]);

  function reintentar() {
    setError(null);
    setClientSecret(null);
    setIntento((n) => n + 1);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bone)" }}>
      <div style={{ padding: "40px 48px 16px", display: "flex", alignItems: "center", gap: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          className="tap"
          style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--ink)" }}
        >
          <Icon name="arrow-left" size={28} sw={2.2} stroke="var(--ink)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {t(lang, "back")}
          </span>
        </button>
        <h2 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 36, color: "var(--ink)" }}>
          {t(lang, "checkoutTitle")}
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 48px 40px" }}>
        {error && (
          <div style={{ textAlign: "center", marginTop: 80 }}>
            <p style={{ fontFamily: "var(--serif)", fontSize: 30, color: "var(--ink)" }}>
              {t(lang, "paymentError")}
            </p>
            <p style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--muted)", maxWidth: 560, margin: "12px auto 28px" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={reintentar}
              className="tap"
              style={{ background: "var(--ink)", color: "#fff", border: "none", borderRadius: 999, padding: "20px 48px", fontFamily: "var(--sans)", fontWeight: 800, fontSize: 22, cursor: "pointer" }}
            >
              {t(lang, "tryAgain")}
            </button>
          </div>
        )}

        {!error && !clientSecret && (
          <p style={{ textAlign: "center", marginTop: 100, fontFamily: "var(--mono)", fontSize: 16, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
            {t(lang, "paying")}
          </p>
        )}

        {!error && clientSecret && (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              fetchClientSecret: async () => clientSecret,
              onComplete: () => {
                if (sessionIdRef.current) onCompleted(sessionIdRef.current);
              },
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
}
