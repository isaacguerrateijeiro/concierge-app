import { NextResponse, type NextRequest } from "next/server";
import { iniciarOnboardingProveedor } from "@/lib/payments/connect";

// Stripe redirige aquí si el enlace de onboarding caducó o se reutilizó.
// Generamos un enlace nuevo y reenviamos al proveedor al flujo de Stripe.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider");
  if (!providerId) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  try {
    const url = await iniciarOnboardingProveedor(providerId);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
}
