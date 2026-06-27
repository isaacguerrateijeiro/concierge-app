import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VentanaTiempo } from "@/lib/panel/rangos";

export interface PuntoSerie {
  dia: string; // YYYY-MM-DD
  ingresos: number;
  pedidos: number;
}

export interface Metrics {
  ingresos: number;
  pedidos: number;
  items: number;
  ticketMedio: number;
  serie: PuntoSerie[];
}

interface MetricsRaw {
  ingresos: number | string;
  pedidos: number;
  items: number | string;
  serie: { dia: string; ingresos: number | string; pedidos: number }[];
}

function n(v: number | string | null | undefined): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;
}

async function metricsRango(
  tenantId: string,
  desde: Date,
  hasta: Date
): Promise<Metrics> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_metrics", {
    p_tenant: tenantId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
  });
  if (error) throw new Error(`panel_metrics: ${error.message}`);
  const raw = data as unknown as MetricsRaw;
  const ingresos = n(raw.ingresos);
  const pedidos = raw.pedidos ?? 0;
  return {
    ingresos,
    pedidos,
    items: n(raw.items),
    ticketMedio: pedidos > 0 ? ingresos / pedidos : 0,
    serie: (raw.serie ?? []).map((p) => ({
      dia: p.dia,
      ingresos: n(p.ingresos),
      pedidos: p.pedidos,
    })),
  };
}

export interface ResumenMetrics {
  actual: Metrics;
  previo: Metrics;
  serieRellena: PuntoSerie[];
}

// Rellena días sin datos para que la gráfica muestre el rango completo.
function rellenarSerie(
  serie: PuntoSerie[],
  desde: Date,
  dias: number
): PuntoSerie[] {
  const mapa = new Map(serie.map((p) => [p.dia, p]));
  const out: PuntoSerie[] = [];
  const base = new Date(desde);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < dias; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push(mapa.get(key) ?? { dia: key, ingresos: 0, pedidos: 0 });
  }
  return out;
}

export async function resumen(
  tenantId: string,
  v: VentanaTiempo
): Promise<ResumenMetrics> {
  const [actual, previo] = await Promise.all([
    metricsRango(tenantId, v.desde, v.hasta),
    metricsRango(tenantId, v.desdePrev, v.hastaPrev),
  ]);
  return {
    actual,
    previo,
    serieRellena: rellenarSerie(actual.serie, v.desde, Math.max(v.dias, 1)),
  };
}

export interface TopServicio {
  titulo: string;
  ingresos: number;
  unidades: number;
}

export async function topServicios(
  tenantId: string,
  desde: Date,
  hasta: Date,
  limite = 6
): Promise<TopServicio[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_top_servicios", {
    p_tenant: tenantId,
    p_desde: desde.toISOString(),
    p_hasta: hasta.toISOString(),
    p_limite: limite,
  });
  if (error) throw new Error(`panel_top_servicios: ${error.message}`);
  const raw = (data as unknown as {
    titulo: string;
    ingresos: number | string;
    unidades: number | string;
  }[]) ?? [];
  return raw.map((r) => ({
    titulo: r.titulo,
    ingresos: n(r.ingresos),
    unidades: n(r.unidades),
  }));
}
