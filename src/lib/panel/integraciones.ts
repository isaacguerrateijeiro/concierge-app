import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ProveedorConnect {
  id: string;
  slug: string;
  nombre: string;
  colorMarca: string | null;
  stripeAccountId: string | null;
  payoutsActivos: boolean;
  onboardingEstado: string | null;
}

export async function listarProveedoresConnect(
  tenantId: string
): Promise<ProveedorConnect[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("providers")
    .select(
      "id, slug, nombre, color_marca, stripe_account_id, stripe_payouts_activos, stripe_onboarding_estado, activo"
    )
    .eq("tenant_id", tenantId)
    .order("nombre", { ascending: true });
  if (error) throw new Error(`listarProveedoresConnect: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    nombre: p.nombre,
    colorMarca: p.color_marca,
    stripeAccountId: p.stripe_account_id,
    payoutsActivos: p.stripe_payouts_activos ?? false,
    onboardingEstado: p.stripe_onboarding_estado,
  }));
}

// Enmascara una identidad de remitente para mostrarla sin exponerla del todo.
export function maskRemitente(v: string | undefined | null): string {
  if (!v) return "—";
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    const um = u.length <= 2 ? u : `${u.slice(0, 2)}***`;
    return `${um}@${d}`;
  }
  if (v.length <= 4) return v;
  return `${v.slice(0, 3)}••••${v.slice(-2)}`;
}
