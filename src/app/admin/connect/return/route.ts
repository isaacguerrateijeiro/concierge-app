import { NextResponse, type NextRequest } from "next/server";
import { sincronizarEstadoProveedor } from "@/lib/payments/connect";

// Stripe redirige aquí al terminar el onboarding. Sincronizamos el estado del
// proveedor y volvemos al panel. (requireAdmin se valida dentro de la acción.)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider");
  if (providerId) {
    try {
      // Esperamos a que Stripe active la capacidad (evita quedarse en restricted).
      await sincronizarEstadoProveedor(providerId, true);
    } catch {
      // Si falla, el panel mostrará el estado actual y permite reintentar.
    }
  }
  return NextResponse.redirect(new URL("/admin", req.url));
}
