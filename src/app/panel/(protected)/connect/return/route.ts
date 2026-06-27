import { NextResponse, type NextRequest } from "next/server";
import { sincronizarEstadoProveedor } from "@/lib/payments/connect";

// Stripe redirige aquí al terminar el onboarding. La autorización (sesión de
// panel + capacidad) la valida la propia acción. Sincronizamos y volvemos a
// Integraciones.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider");
  if (providerId) {
    try {
      await sincronizarEstadoProveedor(providerId, true);
    } catch {
      // Si falla, Integraciones mostrará el estado actual y permite reintentar.
    }
  }
  return NextResponse.redirect(new URL("/panel/settings", req.url));
}
