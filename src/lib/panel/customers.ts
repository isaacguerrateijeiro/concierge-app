import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function n(v: number | string | null | undefined): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;
}

export interface AliasContacto {
  destino: string;
  canal: string;
}

export interface Contacto {
  id: string;
  destino: string;
  canal: string;
  canales: string[];
  contactos: AliasContacto[];
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

export interface PedidoCliente {
  id: string;
  referencia: string | null;
  paidAt: string | null;
  createdAt: string;
  importeTotal: number;
  moneda: string;
  estado: string;
  reciboToken: string | null;
  kiosko: string | null;
  canales: string[];
}

export interface ClienteDetalle extends Contacto {
  historial: PedidoCliente[];
}

function mapAlias(raw: unknown): AliasContacto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const o = x as { destino?: string; canal?: string };
      if (!o?.destino || !o?.canal) return null;
      return { destino: o.destino, canal: o.canal };
    })
    .filter((x): x is AliasContacto => x !== null);
}

function mapCanales(raw: unknown, fallback: string): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(String);
  }
  return fallback ? [fallback] : [];
}

function mapContacto(c: {
  id?: string;
  destino: string;
  canal: string;
  canales?: unknown;
  contactos?: unknown;
  pedidos: number;
  gasto: number | string;
  ultima: string;
}): Contacto {
  const contactos = mapAlias(c.contactos);
  const canales = mapCanales(c.canales, c.canal);
  return {
    id: c.id ?? "",
    destino: c.destino,
    canal: c.canal,
    canales,
    contactos: contactos.length > 0 ? contactos : [{ destino: c.destino, canal: c.canal }],
    pedidos: c.pedidos,
    gasto: n(c.gasto),
    ultima: c.ultima,
  };
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
    contactos: {
      id?: string;
      destino: string;
      canal: string;
      canales?: unknown;
      contactos?: unknown;
      pedidos: number;
      gasto: number | string;
      ultima: string;
    }[];
    total: number;
    recurrentes: number;
    nuevos: number;
    por_canal: Record<string, number>;
  };
  return {
    contactos: (raw.contactos ?? []).map(mapContacto),
    total: raw.total ?? 0,
    recurrentes: raw.recurrentes ?? 0,
    nuevos: raw.nuevos ?? 0,
    porCanal: raw.por_canal ?? {},
  };
}

export async function obtenerCliente(
  tenantId: string,
  clienteId: string
): Promise<ClienteDetalle | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("panel_cliente_detalle", {
    p_tenant: tenantId,
    p_cliente_id: clienteId,
  });
  if (error) throw new Error(`panel_cliente_detalle: ${error.message}`);
  if (!data) return null;

  const raw = data as unknown as {
    id: string;
    destino: string;
    canal: string;
    canales?: unknown;
    contactos?: unknown;
    pedidos: number;
    gasto: number | string;
    ultima: string | null;
    historial?: {
      id: string;
      referencia: string | null;
      paid_at: string | null;
      created_at: string;
      importe_total: number | string;
      moneda: string;
      estado: string;
      recibo_token: string | null;
      kiosko: string | null;
      canales?: unknown;
    }[];
  };

  const base = mapContacto({
    id: raw.id,
    destino: raw.destino,
    canal: raw.canal,
    canales: raw.canales,
    contactos: raw.contactos,
    pedidos: raw.pedidos,
    gasto: raw.gasto,
    ultima: raw.ultima ?? "",
  });

  return {
    ...base,
    historial: (raw.historial ?? []).map((p) => ({
      id: p.id,
      referencia: p.referencia,
      paidAt: p.paid_at,
      createdAt: p.created_at,
      importeTotal: n(p.importe_total),
      moneda: p.moneda,
      estado: p.estado,
      reciboToken: p.recibo_token,
      kiosko: p.kiosko,
      canales: mapCanales(p.canales, ""),
    })),
  };
}

// Enmascara parcialmente un contacto para listados (privacidad por defecto).
export function maskContacto(v: string): string {
  if (v.includes("@")) {
    const [u, d] = v.split("@");
    const um =
      u.length <= 2 ? u[0] + "*" : `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}`;
    return `${um}@${d}`;
  }
  const visible = v.slice(-3);
  return `${"*".repeat(Math.max(2, v.length - 3))}${visible}`;
}
