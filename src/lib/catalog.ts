import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { createSupabaseStatelessClient } from "./supabase/stateless";
import { catalogSchema, type Catalog } from "./catalog.schema";

// Re-exportamos los tipos derivados del esquema para no romper imports previos.
export type {
  Localized,
  CatalogTenant,
  CatalogLocation,
  CatalogCategory,
  CatalogProvider,
  CatalogService,
  Catalog,
} from "./catalog.schema";

// Cada cuántos segundos se revalida el catálogo cacheado. El catálogo cambia
// poco, así que un valor alto da rapidez y resiste cortes de red; cuando el
// panel (Fase 3) edite datos, invalidaremos de inmediato con revalidateCatalog.
const CATALOG_REVALIDATE_SECONDS = 60;

// Etiqueta de caché para poder invalidar el catálogo bajo demanda.
export function catalogCacheTag(tenantSlug: string): string {
  return `catalog:${tenantSlug}`;
}

// Lectura cruda + validación. Es la ÚNICA vía de lectura del frontal:
// respeta RLS (vía get_catalog) y nunca expone comisiones. Valida con Zod
// para que un cambio inesperado en la base no se cuele como fallo silencioso.
async function fetchCatalog(tenantSlug: string): Promise<Catalog> {
  const supabase = createSupabaseStatelessClient();
  const { data, error } = await supabase.rpc("get_catalog", {
    p_tenant_slug: tenantSlug,
  });

  if (error) {
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }

  // Si el tenant no existe, get_catalog devuelve { tenant: null, ... }.
  if (!data || (typeof data === "object" && "tenant" in data && data.tenant === null)) {
    throw new Error(`El tenant '${tenantSlug}' no existe o no tiene datos.`);
  }

  const result = catalogSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `El catálogo de '${tenantSlug}' no tiene el formato esperado:\n${z.prettifyError(result.error)}`
    );
  }

  return result.data;
}

// Catálogo cacheado: se guarda el resultado y se revalida cada
// CATALOG_REVALIDATE_SECONDS. Sirve respuestas instantáneas entre visitas y
// reduce la carga sobre la base de datos. Los errores NO se cachean.
export async function getCatalog(tenantSlug: string): Promise<Catalog> {
  const cached = unstable_cache(
    () => fetchCatalog(tenantSlug),
    ["catalog", tenantSlug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogCacheTag(tenantSlug)],
    }
  );
  return cached();
}
