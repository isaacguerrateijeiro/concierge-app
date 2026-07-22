import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ComisionProveedor, ReglaBeneficiario } from "./commissions.types";

export type { ComisionProveedor, ReglaBeneficiario } from "./commissions.types";

function mapRegla(
  tipo: string | null | undefined,
  valor: number | string | null | undefined,
  activo: boolean | null | undefined
): ReglaBeneficiario | null {
  if (tipo !== "porcentaje" && tipo !== "fijo") return null;
  const v = typeof valor === "string" ? parseFloat(valor) : Number(valor);
  if (!Number.isFinite(v)) return null;
  return { tipoCalculo: tipo, valor: v, activo: activo !== false };
}

export async function listarComisionesProveedor(
  tenantId: string
): Promise<ComisionProveedor[]> {
  const supabase = await createSupabaseServerClient();

  const { data: providers, error: errP } = await supabase
    .from("providers")
    .select("id, slug, nombre, color_marca, activo")
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (errP) throw new Error(`listarComisionesProveedor: ${errP.message}`);

  const ids = (providers ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: reglas, error: errR } = await supabase
    .from("commission_rules")
    .select("provider_id, beneficiario, tipo_calculo, valor, activo")
    .eq("tenant_id", tenantId)
    .eq("ambito", "proveedor")
    .in("provider_id", ids)
    .in("beneficiario", ["plataforma", "operador"]);
  if (errR) throw new Error(`listarComisionesProveedor reglas: ${errR.message}`);

  const porProv = new Map<
    string,
    { plataforma: ReglaBeneficiario | null; operador: ReglaBeneficiario | null }
  >();
  for (const id of ids) {
    porProv.set(id, { plataforma: null, operador: null });
  }
  for (const r of reglas ?? []) {
    if (!r.provider_id) continue;
    const slot = porProv.get(r.provider_id);
    if (!slot) continue;
    const mapped = mapRegla(r.tipo_calculo, r.valor, r.activo);
    if (r.beneficiario === "plataforma") slot.plataforma = mapped;
    if (r.beneficiario === "operador") slot.operador = mapped;
  }

  return (providers ?? []).map((p) => {
    const slot = porProv.get(p.id)!;
    return {
      providerId: p.id,
      slug: p.slug,
      nombre: p.nombre,
      colorMarca: p.color_marca,
      plataforma: slot.plataforma,
      operador: slot.operador,
    };
  });
}
