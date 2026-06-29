import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface FuenteProveedor {
  id: string;
  nombre: string;
  slug: string;
  fuente_url: string | null;
  fuente_config: Record<string, unknown>;
  ultimaImportacion: {
    estado: string;
    detectados: number;
    creados: number;
    actualizados: number;
    errores: number;
    created_at: string;
  } | null;
}

export async function listarFuentes(tenantId: string): Promise<FuenteProveedor[]> {
  const supabase = await createSupabaseServerClient();

  const { data: provs, error } = await supabase
    .from("providers")
    .select("id, nombre, slug, fuente_url, fuente_config")
    .eq("tenant_id", tenantId)
    .order("nombre", { ascending: true });
  if (error) throw new Error(`listarFuentes: ${error.message}`);

  const { data: runs } = await supabase
    .from("import_runs")
    .select("provider_id, estado, detectados, creados, actualizados, errores, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const ultimaPorProveedor = new Map<string, FuenteProveedor["ultimaImportacion"]>();
  for (const r of runs ?? []) {
    if (!ultimaPorProveedor.has(r.provider_id)) {
      ultimaPorProveedor.set(r.provider_id, {
        estado: r.estado,
        detectados: r.detectados,
        creados: r.creados,
        actualizados: r.actualizados,
        errores: r.errores,
        created_at: r.created_at,
      });
    }
  }

  return (provs ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    fuente_url: p.fuente_url,
    fuente_config: (p.fuente_config as Record<string, unknown>) ?? {},
    ultimaImportacion: ultimaPorProveedor.get(p.id) ?? null,
  }));
}
