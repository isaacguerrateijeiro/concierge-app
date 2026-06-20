import "server-only";
import Stripe from "stripe";

// Cliente de Stripe para el servidor. La clave (de TEST mientras desarrollamos)
// vive en STRIPE_SECRET_KEY y nunca sale al navegador. Se crea de forma perezosa
// para no fallar en build si aún no hay clave configurada.
let cliente: Stripe | null = null;

export function getStripe(): Stripe {
  if (cliente) return cliente;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Falta STRIPE_SECRET_KEY en .env.local (usa una clave de TEST: rk_test_... o sk_test_...)."
    );
  }

  cliente = new Stripe(key, {
    // Versión de API fijada (coincide con la del SDK) para que un futuro
    // cambio no altere el comportamiento sin que lo decidamos.
    apiVersion: "2026-05-27.dahlia",
    appInfo: { name: "ConciergeOS", url: "https://github.com/isaacguerrateijeiro/concierge-app" },
  });
  return cliente;
}
