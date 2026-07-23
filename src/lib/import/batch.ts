import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { importarProveedor, type ResultadoImportacion } from "./importar";

// ============================================================
// Actualización batch del catálogo: re-scrape de todos los proveedores con
// fuente configurada. Se usa desde:
//   - el panel ("Actualizar todo"), con el cliente RLS del operador;
//   - el cron nocturno (/api/cron/actualizar-catalogo), con el cliente de
//     servicio (sin sesión de usuario) para recorrer todos los tenants.
// ============================================================

type DbClient = SupabaseClient<Database>;

export interface ResultadoProveedorBatch extends Partial<ResultadoImportacion> {
  providerId: string;
  nombre: string;
  ok: boolean;
  error?: string;
}

export interface ResultadoBatch {
  tenantId: string;
  proveedores: ResultadoProveedorBatch[];
  totales: {
    detectados: number;
    creados: number;
    actualizados: number;
    despublicados: number;
    errores: number;
  };
}

// Actualiza todos los proveedores con fuente_url de un tenant. Si no se pasa
// cliente, se usa el de servicio (para contextos sin sesión).
export async function actualizarCatalogoTenant(
  tenantId: string,
  db?: DbClient
): Promise<ResultadoBatch> {
  const supabase: DbClient = db ?? createSupabaseAdminClient();

  const { data: provs, error } = await supabase
    .from("providers")
    .select("id, nombre")
    .eq("tenant_id", tenantId)
    .not("fuente_url", "is", null);
  if (error) throw new Error(`No se pudieron listar proveedores: ${error.message}`);

  const proveedores: ResultadoProveedorBatch[] = [];
  const totales = { detectados: 0, creados: 0, actualizados: 0, despublicados: 0, errores: 0 };

  for (const p of provs ?? []) {
    try {
      const res = await importarProveedor(tenantId, p.id, supabase);
      totales.detectados += res.detectados;
      totales.creados += res.creados;
      totales.actualizados += res.actualizados;
      totales.despublicados += res.despublicados;
      totales.errores += res.errores;
      proveedores.push({ providerId: p.id, nombre: p.nombre, ok: res.estado !== "error", ...res });
    } catch (e) {
      proveedores.push({
        providerId: p.id,
        nombre: p.nombre,
        ok: false,
        error: e instanceof Error ? e.message : "error",
      });
      totales.errores += 1;
    }
  }

  return { tenantId, proveedores, totales };
}

// Recorre todos los tenants con proveedores que tengan fuente_url. Pensado para
// el cron (cliente de servicio, omite RLS).
export async function actualizarTodosLosTenants(): Promise<ResultadoBatch[]> {
  const supabase = createSupabaseAdminClient();
  const { data: provs, error } = await supabase
    .from("providers")
    .select("tenant_id")
    .not("fuente_url", "is", null);
  if (error) throw new Error(`No se pudieron listar proveedores: ${error.message}`);

  const tenantIds = Array.from(new Set((provs ?? []).map((p) => p.tenant_id)));
  const resultados: ResultadoBatch[] = [];
  for (const tenantId of tenantIds) {
    resultados.push(await actualizarCatalogoTenant(tenantId, supabase));
  }
  return resultados;
}
