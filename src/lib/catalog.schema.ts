import { z } from "zod";

// ============================================================
// Esquema de validación del catálogo (fuente ÚNICA de verdad).
//
// La función RPC get_catalog() de Supabase devuelve un JSON. TypeScript
// no puede comprobar en ejecución que ese JSON tenga la forma esperada,
// así que lo validamos con Zod al recibirlo. Si la base cambia o devuelve
// algo inesperado, el error se detecta aquí de inmediato (no se cuela como
// un fallo silencioso en la interfaz). Los tipos TypeScript se DERIVAN de
// este esquema con z.infer, de modo que esquema y tipos nunca divergen.
// ============================================================

// Un texto traducible: { es: "...", en: "...", ... }. Ampliable a más idiomas.
export const localizedSchema = z.record(z.string(), z.string());

// Canales de entrega posibles para el comprobante. Fuente única de verdad.
export const canalEntregaSchema = z.enum(["email", "sms", "whatsapp", "print"]);
export type CanalEntrega = z.infer<typeof canalEntregaSchema>;

// Parte PÚBLICA de la config de entrega que expone get_catalog al kiosko:
// qué canales están habilitados y el texto de consentimiento por idioma.
// El remitente y demás identidades NO se exponen aquí (solo servidor).
export const entregaPublicaSchema = z
  .object({
    canales: z.array(canalEntregaSchema).default([]),
    consentimiento: localizedSchema.default({}),
  })
  .default({ canales: [], consentimiento: {} });
export type EntregaPublica = z.infer<typeof entregaPublicaSchema>;

export const catalogTenantSchema = z.object({
  slug: z.string(),
  nombre: z.string(),
  branding: z
    .object({
      colors: z
        .object({
          ink: z.string().optional(),
          bone: z.string().optional(),
          accent: z.string().optional(),
        })
        .optional(),
      fonts: z
        .object({
          serif: z.string().optional(),
          sans: z.string().optional(),
        })
        .optional(),
      mark: z.string().optional(),
    })
    // El branding es JSONB libre: aceptamos claves extra sin romper.
    .loose(),
  locales: z.array(z.string()).min(1),
  locale_default: z.string(),
  // Micro-textos de interfaz configurables: { idioma: { clave: texto } }.
  // Por defecto {}: el frontal completa con sus textos de respaldo.
  ui: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  // Config pública de entrega del comprobante (canales + consentimiento).
  entrega: entregaPublicaSchema,
});

export const catalogLocationSchema = z.object({
  // UUID de public.locations: identifica el kiosko físico en pedidos/analítica.
  id: z.string().uuid(),
  nombre: z.string(),
  tipo_i18n: localizedSchema,
  orden: z.number(),
});

export const catalogCategorySchema = z.object({
  slug: z.string(),
  nombre_i18n: localizedSchema,
  subtitulo_i18n: localizedSchema,
  orden: z.number(),
});

export const catalogProviderSchema = z.object({
  slug: z.string(),
  nombre: z.string(),
  color_marca: z.string().nullable(),
  logo: z.string().nullable(),
});

// Tarifa por tipo de pasajero (adulto, niño, senior…).
export const priceTierSchema = z.object({
  tipo: z.string(),
  label_i18n: localizedSchema,
  precio: z.number(),
  orden: z.number().default(0),
});

export const catalogServiceSchema = z.object({
  slug: z.string(),
  titulo_i18n: localizedSchema,
  subtitulo_i18n: localizedSchema,
  // Descripción larga por idioma (texto rico del detalle del producto).
  descripcion_i18n: localizedSchema.default({}),
  // Punto de encuentro / lugar de salida por idioma (p.ej. free tours a pie).
  punto_encuentro_i18n: localizedSchema.default({}),
  // Cómo usar el billete / embarcar (p.ej. activar en la app de Big Bus).
  instrucciones_i18n: localizedSchema.default({}),
  // Etiqueta de duración por idioma: {"es":"Medio día","en":"Half day"}.
  duracion_i18n: localizedSchema.default({}),
  // Un 'grupo' no tiene modelo de pago (no se vende); un 'servicio' sí.
  tipo_pago: z.enum(["integrado", "derivado"]).nullable().default(null),
  // Tipo de nodo del árbol del catálogo.
  tipo_nodo: z.enum(["grupo", "servicio"]).default("servicio"),
  // Slug del nodo padre (null = nivel superior dentro de su categoría).
  parent: z.string().nullable().default(null),
  precio_desde: z.number().nullable(),
  moneda: z.string(),
  url_redireccion: z.string().nullable(),
  icono: z.string().nullable(),
  imagen_url: z.string().nullable().default(null),
  orden: z.number(),
  categoria: z.string(),
  // Tarifas por tipo de pasajero. Vacío para servicios de precio único.
  price_tiers: z.array(priceTierSchema).default([]),
  proveedor: catalogProviderSchema,
});

export const catalogSchema = z.object({
  tenant: catalogTenantSchema,
  locations: z.array(catalogLocationSchema),
  categories: z.array(catalogCategorySchema),
  services: z.array(catalogServiceSchema),
});

// Tipos derivados del esquema: una sola fuente de verdad.
export type Localized = z.infer<typeof localizedSchema>;
export type CatalogTenant = z.infer<typeof catalogTenantSchema>;
export type CatalogLocation = z.infer<typeof catalogLocationSchema>;
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
export type CatalogProvider = z.infer<typeof catalogProviderSchema>;
export type PriceTier = z.infer<typeof priceTierSchema>;
export type CatalogService = z.infer<typeof catalogServiceSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

// Devuelve el texto en el idioma pedido, con respaldo al primer idioma
// disponible. Es una utilidad pura, segura de usar en cliente y servidor.
export function tx(value: Localized | null | undefined, lang: string): string {
  if (!value) return "";
  return value[lang] ?? Object.values(value)[0] ?? "";
}

// Nodo del catálogo con sus hijos resueltos (árbol). Deriva de CatalogService.
export interface CatalogServiceNode extends CatalogService {
  children: CatalogServiceNode[];
}

// Construye el árbol de servicios a partir de la lista plana usando `parent`
// (slug del padre). Devuelve los nodos de nivel superior de una categoría,
// ya ordenados. Es una utilidad pura (cliente y servidor).
export function buildServiceTree(
  services: CatalogService[],
  categoriaSlug?: string
): CatalogServiceNode[] {
  const porSlug = new Map<string, CatalogServiceNode>();
  for (const s of services) porSlug.set(s.slug, { ...s, children: [] });

  const raices: CatalogServiceNode[] = [];
  for (const node of porSlug.values()) {
    if (node.parent && porSlug.has(node.parent)) {
      porSlug.get(node.parent)!.children.push(node);
    } else {
      raices.push(node);
    }
  }

  const ordenar = (arr: CatalogServiceNode[]) => {
    arr.sort((a, b) => a.orden - b.orden);
    for (const n of arr) ordenar(n.children);
  };
  ordenar(raices);

  return categoriaSlug
    ? raices.filter((n) => n.categoria === categoriaSlug)
    : raices;
}
