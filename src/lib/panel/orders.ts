import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PedidoItemMini {
  titulo: string;
  cantidad: number;
}

export interface PedidoFila {
  id: string;
  referencia: string | null;
  createdAt: string;
  paidAt: string | null;
  importeTotal: number;
  moneda: string;
  estado: string;
  reciboToken: string | null;
  kiosko: string | null;
  items: PedidoItemMini[];
}

export interface FiltroPedidos {
  estado?: "all" | "paid" | "pending";
  q?: string;
  limite?: number;
  offset?: number;
}

function n(v: number | string | null | undefined): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v ?? 0;
}

interface OrderRow {
  id: string;
  referencia: string | null;
  created_at: string;
  paid_at: string | null;
  importe_total: number | string;
  moneda: string;
  estado: string;
  recibo_token: string | null;
  locations: { nombre: string } | null;
  order_items: { titulo: string; cantidad: number }[] | null;
}

export interface ResultadoPedidos {
  filas: PedidoFila[];
  total: number;
}

export async function listarPedidos(
  tenantId: string,
  filtro: FiltroPedidos = {}
): Promise<ResultadoPedidos> {
  const supabase = await createSupabaseServerClient();
  const limite = filtro.limite ?? 50;
  const offset = filtro.offset ?? 0;

  let query = supabase
    .from("orders")
    .select(
      "id, referencia, created_at, paid_at, importe_total, moneda, estado, recibo_token, locations(nombre), order_items(titulo, cantidad)",
      { count: "exact" }
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limite - 1);

  if (filtro.estado === "paid") query = query.eq("estado", "paid");
  else if (filtro.estado === "pending") query = query.neq("estado", "paid");

  if (filtro.q && filtro.q.trim()) {
    query = query.ilike("referencia", `%${filtro.q.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`listarPedidos: ${error.message}`);

  const filas = ((data as unknown as OrderRow[]) ?? []).map((o) => ({
    id: o.id,
    referencia: o.referencia,
    createdAt: o.created_at,
    paidAt: o.paid_at,
    importeTotal: n(o.importe_total),
    moneda: o.moneda,
    estado: o.estado,
    reciboToken: o.recibo_token,
    kiosko: o.locations?.nombre ?? null,
    items: (o.order_items ?? []).map((it) => ({
      titulo: it.titulo,
      cantidad: it.cantidad,
    })),
  }));

  return { filas, total: count ?? filas.length };
}

export function resumenItems(items: PedidoItemMini[]): string {
  if (items.length === 0) return "—";
  return items
    .map((it) => (it.cantidad > 1 ? `${it.titulo} ×${it.cantidad}` : it.titulo))
    .join(", ");
}

export function etiquetaEstado(estado: string): { label: string; cls: string } {
  switch (estado) {
    case "paid":
      return { label: "Completado", cls: "live" };
    case "pending":
    case "created":
      return { label: "Procesando", cls: "draft" };
    case "failed":
    case "canceled":
      return { label: "Cancelado", cls: "danger" };
    default:
      return { label: estado, cls: "paused" };
  }
}
