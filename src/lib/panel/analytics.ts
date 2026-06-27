import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function n(v: number | string | null | undefined): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;
}

export interface PuntoHora {
  dow: number; // 0=domingo … 6=sábado
  hora: number; // 0-23
  n: number;
}

export interface Funnel {
  sesiones: number;
  carrito: number;
  checkout: number;
  conversiones: number;
  duracionMediaSeg: number;
  porHora: PuntoHora[];
  // tasas
  tasaCarrito: number;
  tasaCheckout: number;
  tasaConversion: number;
}

export async function funnel(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<Funnel> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_funnel", {
    p_tenant: tenantId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });
  if (error) throw new Error(`panel_funnel: ${error.message}`);
  const raw = data as unknown as {
    sesiones: number;
    carrito: number;
    checkout: number;
    conversiones: number;
    duracion_media_seg: number;
    por_hora: PuntoHora[];
  };
  const sesiones = raw.sesiones ?? 0;
  const pct = (x: number) => (sesiones > 0 ? (x / sesiones) * 100 : 0);
  return {
    sesiones,
    carrito: raw.carrito ?? 0,
    checkout: raw.checkout ?? 0,
    conversiones: raw.conversiones ?? 0,
    duracionMediaSeg: raw.duracion_media_seg ?? 0,
    porHora: raw.por_hora ?? [],
    tasaCarrito: pct(raw.carrito ?? 0),
    tasaCheckout: pct(raw.checkout ?? 0),
    tasaConversion: pct(raw.conversiones ?? 0),
  };
}

export interface VentaCorte {
  nombre: string;
  ingresos: number;
  unidades: number;
  color?: string | null;
}

export interface Ventas {
  categorias: VentaCorte[];
  proveedores: VentaCorte[];
}

export async function ventas(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<Ventas> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_ventas", {
    p_tenant: tenantId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });
  if (error) throw new Error(`panel_ventas: ${error.message}`);
  const raw = data as unknown as {
    categorias: { nombre: string; ingresos: number | string; unidades: number | string }[];
    proveedores: { nombre: string; color: string | null; ingresos: number | string; unidades: number | string }[];
  };
  return {
    categorias: (raw.categorias ?? []).map((c) => ({
      nombre: c.nombre,
      ingresos: n(c.ingresos),
      unidades: n(c.unidades),
    })),
    proveedores: (raw.proveedores ?? []).map((p) => ({
      nombre: p.nombre,
      color: p.color,
      ingresos: n(p.ingresos),
      unidades: n(p.unidades),
    })),
  };
}
