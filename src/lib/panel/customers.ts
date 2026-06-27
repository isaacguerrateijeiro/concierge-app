import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function n(v: number | string | null | undefined): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;
}

export interface Contacto {
  destino: string;
  canal: string;
  pedidos: number;
  gasto: number;
  ultima: string;
}

export interface Clientes {
  contactos: Contacto[];
  total: number;
  recurrentes: number;
  nuevos: number;
  porCanal: Record<string, number>;
}

export async function listarClientes(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<Clientes> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_clientes", {
    p_tenant: tenantId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });
  if (error) throw new Error(`panel_clientes: ${error.message}`);
  const raw = data as unknown as {
    contactos: { destino: string; canal: string; pedidos: number; gasto: number | string; ultima: string }[];
    total: number;
    recurrentes: number;
    nuevos: number;
    por_canal: Record<string, number>;
  };
  return {
    contactos: (raw.contactos ?? []).map((c) => ({
      destino: c.destino,
      canal: c.canal,
      pedidos: c.pedidos,
      gasto: n(c.gasto),
      ultima: c.ultima,
    })),
    total: raw.total ?? 0,
    recurrentes: raw.recurrentes ?? 0,
    nuevos: raw.nuevos ?? 0,
    porCanal: raw.por_canal ?? {},
  };
}

// Enmascara parcialmente un contacto para listados (privacidad por defecto).
export function maskContacto(v: string): string {
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    const um = u.length <= 2 ? u[0] + "*" : `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}`;
    return `${um}@${d}`;
  }
  const visible = v.slice(-3);
  return `${"*".repeat(Math.max(2, v.length - 3))}${visible}`;
}
