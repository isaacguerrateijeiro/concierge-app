import "server-only";
import { z } from "zod";
import { createSupabaseStatelessClient } from "./supabase/stateless";

// ============================================================
// Lectura del recibo público por token (RPC get_recibo).
// Valida la forma con Zod: solo pedidos pagados; sin datos sensibles.
// ============================================================

const reciboBrandingSchema = z
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
  .loose();

const reciboVoucherSchema = z
  .object({
    codigo: z.string(),
    token: z.string(),
    estado: z.string(),
  })
  .nullable();

const reciboItemSchema = z.object({
  titulo: z.string(),
  cantidad: z.number(),
  precio_unitario: z.number(),
  importe: z.number(),
  iva_tipo: z.coerce.number().nullable().default(null),
  fecha_servicio: z.string().nullable().default(null),
  punto_encuentro: z
    .union([z.string(), z.record(z.string(), z.string())])
    .nullable()
    .default(null),
  voucher: reciboVoucherSchema,
});

// Texto multi-idioma {es,en} o cadena simple. Se normaliza a objeto.
const textoLocalizadoSchema = z
  .union([z.string(), z.record(z.string(), z.string())])
  .nullable()
  .optional();

const desgloseIvaSchema = z.object({
  tipo: z.coerce.number(),
  base: z.coerce.number(),
  cuota: z.coerce.number(),
});

const facturaSchema = z
  .object({
    serie: z.string(),
    anio: z.coerce.number(),
    numero: z.coerce.number(),
    referencia: z.string(),
    fecha: z.string(),
    base_imponible: z.coerce.number(),
    cuota_iva: z.coerce.number(),
    total: z.coerce.number(),
    desglose_iva: z.array(desgloseIvaSchema).default([]),
  })
  .nullable();

const emisorSchema = z.object({
  razon_social: z.string().nullable().optional(),
  nif: z.string().nullable().optional(),
  domicilio: z.string().nullable().optional(),
});

const reciboProveedorSchema = z.object({
  slug: z.string(),
  nombre: z.string(),
  color_marca: z.string().nullable().optional(),
  emisor: emisorSchema,
  factura: facturaSchema,
  soporte: z.object({
    email: z.string().nullable().optional(),
    telefono: z.string().nullable().optional(),
  }),
  cancelacion: textoLocalizadoSchema,
  terminos_url: z.string().nullable().optional(),
  privacidad_url: z.string().nullable().optional(),
  items: z.array(reciboItemSchema),
});

const reciboLegalSchema = z
  .object({
    razon_social: z.string().optional(),
    nif: z.string().optional(),
    domicilio: z.string().optional(),
    soporte_email: z.string().optional(),
    soporte_telefono: z.string().optional(),
    terminos_url: z.string().optional(),
    privacidad_url: z.string().optional(),
    iva_default: z.coerce.number().optional(),
  })
  .loose();

export const reciboSchema = z.object({
  estado: z.string(),
  importe_total: z.number(),
  moneda: z.string(),
  created_at: z.string(),
  idioma: z.string().nullable(),
  referencia: z.string().nullable(),
  tenant: z.object({
    slug: z.string(),
    nombre: z.string(),
    branding: reciboBrandingSchema,
  }),
  legal: reciboLegalSchema.default({}),
  proveedores: z.array(reciboProveedorSchema).default([]),
});

export type Recibo = z.infer<typeof reciboSchema>;
export type ReciboItem = z.infer<typeof reciboItemSchema>;
export type ReciboProveedor = z.infer<typeof reciboProveedorSchema>;
export type ReciboFactura = z.infer<typeof facturaSchema>;

// Devuelve el recibo o null si el token no corresponde a un pedido pagado.
export async function fetchRecibo(token: string): Promise<Recibo | null> {
  const supabase = createSupabaseStatelessClient();
  const { data, error } = await supabase.rpc("get_recibo", { p_token: token });
  if (error) {
    throw new Error(`No se pudo cargar el recibo: ${error.message}`);
  }
  if (!data || typeof data !== "object" || !("estado" in data)) {
    return null;
  }
  const parsed = reciboSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data;
}
