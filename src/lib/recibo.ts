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
  voucher: reciboVoucherSchema,
});

export const reciboSchema = z.object({
  estado: z.string(),
  importe_total: z.number(),
  moneda: z.string(),
  created_at: z.string(),
  idioma: z.string().nullable(),
  tenant: z.object({
    slug: z.string(),
    nombre: z.string(),
    branding: reciboBrandingSchema,
  }),
  items: z.array(reciboItemSchema),
});

export type Recibo = z.infer<typeof reciboSchema>;
export type ReciboItem = z.infer<typeof reciboItemSchema>;

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
