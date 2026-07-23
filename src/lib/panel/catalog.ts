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

export interface PriceTierPanel {
  id: string;
  tipo: string;
  label_i18n: I18n;
  precio: number;
  orden: number;
  activo: boolean;
}

export interface AvailabilityPanel {
  fecha: string;
  capacidad: number;
  reservados: number;
  activo: boolean;
}

export interface ServicioPanel {
  id: string;
  slug: string;
  titulo_i18n: I18n;
  subtitulo_i18n: I18n;
  descripcion_i18n: I18n;
  punto_encuentro_i18n: I18n;
  instrucciones_i18n: I18n;
  precio_desde: number | null;
  iva_tipo: number | null;
  moneda: string;
  tipo_pago: string | null;
  tipo_nodo: "grupo" | "servicio";
  estado: "borrador" | "publicado" | "despublicado";
  parent_id: string | null;
  imagen_url: string | null;
  fuente_ref: string | null;
  url_redireccion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
  category_id: string;
  provider_id: string;
  categoriaNombre: string;
  proveedorNombre: string;
  proveedorColor: string | null;
  capacidad_diaria: number | null;
  // Última importación batch/scrape; null si el nodo es manual.
  importado_at: string | null;
  created_at: string;
  tiers: PriceTierPanel[];
  availability: AvailabilityPanel[];
}

// Nodo del árbol de servicios para el panel (con profundidad para sangría).
export interface ServicioNodo extends ServicioPanel {
  children: ServicioNodo[];
  depth: number;
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
  descripcion_i18n: unknown;
  punto_encuentro_i18n: unknown;
  instrucciones_i18n: unknown;
  precio_desde: number | string | null;
  iva_tipo: number | string | null;
  moneda: string;
  tipo_pago: string | null;
  tipo_nodo: string;
  estado: string;
  parent_id: string | null;
  imagen_url: string | null;
  fuente_ref: string | null;
  url_redireccion: string | null;
  icono: string | null;
  activo: boolean;
  orden: number;
  category_id: string;
  provider_id: string;
  capacidad_diaria: number | null;
  importado_at: string | null;
  created_at: string;
  categories: { nombre_i18n: unknown } | null;
  providers: { nombre: string; color_marca: string | null } | null;
}

const SERVICE_COLS =
  "id, slug, titulo_i18n, subtitulo_i18n, descripcion_i18n, punto_encuentro_i18n, instrucciones_i18n, precio_desde, iva_tipo, moneda, tipo_pago, tipo_nodo, estado, parent_id, imagen_url, fuente_ref, url_redireccion, icono, activo, orden, category_id, provider_id, capacidad_diaria, importado_at, created_at, categories(nombre_i18n), providers(nombre, color_marca)";

function mapServicio(s: ServicioRow, localeDefault: string): ServicioPanel {
  return {
    id: s.id,
    slug: s.slug,
    titulo_i18n: i18n(s.titulo_i18n),
    subtitulo_i18n: i18n(s.subtitulo_i18n),
    descripcion_i18n: i18n(s.descripcion_i18n),
    punto_encuentro_i18n: i18n(s.punto_encuentro_i18n),
    instrucciones_i18n: i18n(s.instrucciones_i18n),
    precio_desde: num(s.precio_desde),
    iva_tipo: num(s.iva_tipo),
    moneda: s.moneda,
    tipo_pago: s.tipo_pago,
    tipo_nodo: s.tipo_nodo === "grupo" ? "grupo" : "servicio",
    estado:
      s.estado === "despublicado"
        ? "despublicado"
        : s.estado === "borrador"
          ? "borrador"
          : "publicado",
    parent_id: s.parent_id,
    imagen_url: s.imagen_url,
    fuente_ref: s.fuente_ref,
    url_redireccion: s.url_redireccion,
    icono: s.icono,
    activo: s.activo,
    orden: s.orden,
    category_id: s.category_id,
    provider_id: s.provider_id,
    categoriaNombre: loc(i18n(s.categories?.nombre_i18n), localeDefault),
    proveedorNombre: s.providers?.nombre ?? "—",
    proveedorColor: s.providers?.color_marca ?? null,
    capacidad_diaria: s.capacidad_diaria ?? null,
    importado_at: s.importado_at ?? null,
    created_at: s.created_at,
    tiers: [],
    availability: [],
  };
}

export async function listarServicios(
  tenantId: string,
  localeDefault = "es"
): Promise<ServicioPanel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_COLS)
    .eq("tenant_id", tenantId)
    .order("orden", { ascending: true });
  if (error) throw new Error(`listarServicios: ${error.message}`);

  const servicios = ((data as unknown as ServicioRow[]) ?? []).map((s) =>
    mapServicio(s, localeDefault)
  );

  // Cargar tarifas por tipo de pasajero para todos los servicios del tenant.
  if (servicios.length > 0) {
    const ids = servicios.map((s) => s.id);
    const { data: tiersData } = await supabase
      .from("service_price_tiers")
      .select("id, service_id, tipo, label_i18n, precio, orden, activo")
      .in("service_id", ids)
      .order("orden", { ascending: true });

    if (tiersData) {
      const tierMap = new Map<string, PriceTierPanel[]>();
      for (const t of tiersData) {
        if (!tierMap.has(t.service_id)) tierMap.set(t.service_id, []);
        tierMap.get(t.service_id)!.push({
          id: t.id,
          tipo: t.tipo,
          label_i18n: i18n(t.label_i18n),
          precio: num(t.precio) ?? 0,
          orden: t.orden,
          activo: t.activo,
        });
      }
      for (const s of servicios) {
        s.tiers = tierMap.get(s.id) ?? [];
      }
    }

    // Cargar stock por fecha (solo fechas de hoy en adelante) para el editor.
    const hoyStr = new Date().toISOString().slice(0, 10);
    const { data: availData } = await supabase
      .from("service_availability")
      .select("service_id, fecha, capacidad, reservados, activo")
      .in("service_id", ids)
      .gte("fecha", hoyStr)
      .order("fecha", { ascending: true });

    if (availData) {
      const availMap = new Map<string, AvailabilityPanel[]>();
      for (const a of availData) {
        if (!availMap.has(a.service_id)) availMap.set(a.service_id, []);
        availMap.get(a.service_id)!.push({
          fecha: a.fecha,
          capacidad: a.capacidad,
          reservados: a.reservados,
          activo: a.activo,
        });
      }
      for (const s of servicios) {
        s.availability = availMap.get(s.id) ?? [];
      }
    }
  }

  return servicios;
}

// Devuelve los servicios como árbol con profundidad, ordenados por categoría y
// orden, listo para pintar con sangría en el panel.
export function arbolServicios(servicios: ServicioPanel[]): ServicioNodo[] {
  const porId = new Map<string, ServicioNodo>();
  for (const s of servicios) porId.set(s.id, { ...s, children: [], depth: 0 });

  const raices: ServicioNodo[] = [];
  for (const node of porId.values()) {
    if (node.parent_id && porId.has(node.parent_id)) {
      porId.get(node.parent_id)!.children.push(node);
    } else {
      raices.push(node);
    }
  }

  const flat: ServicioNodo[] = [];
  const visitar = (nodos: ServicioNodo[], depth: number) => {
    nodos.sort((a, b) => a.orden - b.orden);
    for (const n of nodos) {
      n.depth = depth;
      flat.push(n);
      visitar(n.children, depth + 1);
    }
  };
  visitar(raices, 0);
  return flat;
}

export async function getServicio(
  tenantId: string,
  id: string
): Promise<ServicioPanel | null> {
  const servicios = await listarServicios(tenantId);
  return servicios.find((s) => s.id === id) ?? null;
}

export interface OpcionPadre {
  id: string;
  label: string;
}

// Lista de nodos 'grupo' que pueden actuar como padre, con sangría que refleja
// su profundidad. Excluye el propio nodo (no puede ser su propio padre).
export function opcionesPadre(
  servicios: ServicioPanel[],
  localeDefault = "es",
  excluirId?: string
): OpcionPadre[] {
  const arbol = arbolServicios(servicios);
  return arbol
    .filter((n) => n.tipo_nodo === "grupo" && n.id !== excluirId)
    .map((n) => ({
      id: n.id,
      label: `${"— ".repeat(n.depth)}${loc(n.titulo_i18n, localeDefault) || n.slug}`,
    }));
}

export async function getCategoria(
  tenantId: string,
  id: string
): Promise<CategoriaPanel | null> {
  const cats = await listarCategorias(tenantId);
  return cats.find((c) => c.id === id) ?? null;
}
