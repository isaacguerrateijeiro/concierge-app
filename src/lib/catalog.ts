import { supabase } from "./supabase";

// Un texto traducible: { es: "...", en: "...", ... }. Ampliable a más idiomas.
export type Localized = Record<string, string>;

export interface CatalogTenant {
  slug: string;
  nombre: string;
  branding: {
    colors?: { ink?: string; bone?: string; accent?: string };
    fonts?: { serif?: string; sans?: string };
    mark?: string;
  };
  locales: string[];
  locale_default: string;
}

export interface CatalogLocation {
  nombre: string;
  tipo_i18n: Localized;
  orden: number;
}

export interface CatalogCategory {
  slug: string;
  nombre_i18n: Localized;
  subtitulo_i18n: Localized;
  orden: number;
}

export interface CatalogProvider {
  slug: string;
  nombre: string;
  color_marca: string | null;
  logo: string | null;
}

export interface CatalogService {
  slug: string;
  titulo_i18n: Localized;
  subtitulo_i18n: Localized;
  tipo_pago: "integrado" | "derivado";
  precio_desde: number | null;
  moneda: string;
  url_redireccion: string | null;
  icono: string | null;
  orden: number;
  categoria: string;
  proveedor: CatalogProvider;
}

export interface Catalog {
  tenant: CatalogTenant;
  locations: CatalogLocation[];
  categories: CatalogCategory[];
  services: CatalogService[];
}

// Lee el catálogo de un tenant desde Supabase (función RPC get_catalog).
// Es la ÚNICA vía de lectura del frontal: respeta RLS y nunca expone comisiones.
export async function getCatalog(tenantSlug: string): Promise<Catalog> {
  const { data, error } = await supabase.rpc("get_catalog", {
    p_tenant_slug: tenantSlug,
  });

  if (error) {
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }
  const catalog = data as Catalog | null;
  if (!catalog || !catalog.tenant) {
    throw new Error(`El tenant '${tenantSlug}' no existe o no tiene datos.`);
  }
  return catalog;
}

// Devuelve el texto en el idioma pedido, con respaldo al primer idioma disponible.
export function tx(value: Localized | null | undefined, lang: string): string {
  if (!value) return "";
  return value[lang] ?? Object.values(value)[0] ?? "";
}
