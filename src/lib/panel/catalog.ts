import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface I18n {
  [locale: string]: string;
}

export interface CategoriaPanel {
  id: string;
  slug: string;
  nombre_i18n: I18n;
  subtitulo_i18n: I18n;
  orden: number;
  activo: boolean;
  numServicios: number;
}

export interface ProveedorMini {
  id: string;
  nombre: string;
  slug: string;
  color_marca: string | null;
}

export interface ServicioPanel {
  id: string;
  slug: string;
  titulo_i18n: I18n;
  subtitulo_i18n: I18n;
  precio_desde: number | null;
  iva_tipo: number | null;
  moneda: string;
  tipo_pago: string;
  url_redireccion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
  category_id: string;
  provider_id: string;
  categoriaNombre: string;
  proveedorNombre: string;
  proveedorColor: string | null;
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "string" ? parseFloat(v) : v;
}

function i18n(v: unknown): I18n {
  return (v as I18n) ?? {};
}

export function loc(t: I18n, locale: string, fallback = "es"): string {
  return t[locale] ?? t[fallback] ?? Object.values(t)[0] ?? "";
}

export async function listarCategorias(tenantId: string): Promise<CategoriaPanel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, nombre_i18n, subtitulo_i18n, orden, activo, services(count)")
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`listarCategorias: ${error.message}`);
  return (data ?? []).map((c) => {
    const count =
      Array.isArray(c.services) && c.services.length > 0
        ? (c.services[0] as { count: number }).count
        : 0;
    return {
      id: c.id,
      slug: c.slug,
      nombre_i18n: i18n(c.nombre_i18n),
      subtitulo_i18n: i18n(c.subtitulo_i18n),
      orden: c.orden,
      activo: c.activo,
      numServicios: count,
    };
  });
}

export async function getLocalesTenant(tenantId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("locales")
    .eq("id", tenantId)
    .maybeSingle();
  return data?.locales ?? ["es"];
}

export async function listarProveedores(tenantId: string): Promise<ProveedorMini[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("providers")
    .select("id, nombre, slug, color_marca")
    .eq("tenant_id", tenantId)
    .order("nombre", { ascending: true });
  if (error) throw new Error(`listarProveedores: ${error.message}`);
  return data ?? [];
}

interface ServicioRow {
  id: string;
  slug: string;
  titulo_i18n: unknown;
  subtitulo_i18n: unknown;
  precio_desde: number | string | null;
  iva_tipo: number | string | null;
  moneda: string;
  tipo_pago: string;
  url_redireccion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
  category_id: string;
  provider_id: string;
  categories: { nombre_i18n: unknown } | null;
  providers: { nombre: string; color_marca: string | null } | null;
}

export async function listarServicios(
  tenantId: string,
  localeDefault = "es"
): Promise<ServicioPanel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, slug, titulo_i18n, subtitulo_i18n, precio_desde, iva_tipo, moneda, tipo_pago, url_redireccion, icono, activo, orden, category_id, provider_id, categories(nombre_i18n), providers(nombre, color_marca)"
    )
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`listarServicios: ${error.message}`);

  return ((data as unknown as ServicioRow[]) ?? []).map((s) => ({
    id: s.id,
    slug: s.slug,
    titulo_i18n: i18n(s.titulo_i18n),
    subtitulo_i18n: i18n(s.subtitulo_i18n),
    precio_desde: num(s.precio_desde),
    iva_tipo: num(s.iva_tipo),
    moneda: s.moneda,
    tipo_pago: s.tipo_pago,
    url_redireccion: s.url_redireccion,
    icono: s.icono,
    activo: s.activo,
    orden: s.orden,
    category_id: s.category_id,
    provider_id: s.provider_id,
    categoriaNombre: loc(i18n(s.categories?.nombre_i18n), localeDefault),
    proveedorNombre: s.providers?.nombre ?? "—",
    proveedorColor: s.providers?.color_marca ?? null,
  }));
}

export async function getServicio(
  tenantId: string,
  id: string
): Promise<ServicioPanel | null> {
  const servicios = await listarServicios(tenantId);
  return servicios.find((s) => s.id === id) ?? null;
}

export async function getCategoria(
  tenantId: string,
  id: string
): Promise<CategoriaPanel | null> {
  const cats = await listarCategorias(tenantId);
  return cats.find((c) => c.id === id) ?? null;
}
