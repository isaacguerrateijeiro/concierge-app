import { z } from "zod";

// Esquema del carrito que el kiosko envía al servidor. SOLO contiene QUÉ
// servicios, CUÁNTOS y para qué fecha/tipo de pasajero; nunca precios.
// El servidor recalcula importes desde la base de datos para que el cliente
// no pueda manipular lo que paga.

export const pasajeroSchema = z.object({
  tipo: z.string().min(1),
  cantidad: z.number().int().positive().max(20),
});

// Una línea del carrito puede ser:
//   - Servicio con tarifas por pasajero: { service_slug, fecha?, pasajeros }
//   - Servicio simple de precio único:   { service_slug, cantidad }
export const cartLineItemSchema = z
  .object({
    service_slug: z.string().min(1),
    // Fecha del servicio en formato ISO (YYYY-MM-DD). Solo informativa.
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (YYYY-MM-DD)")
      .optional(),
    // Pasajeros por tipo (servicio con tarifas variables).
    pasajeros: z.array(pasajeroSchema).min(1).optional(),
    // Unidades (servicio de precio único, sin tarifas por pasajero).
    cantidad: z.number().int().positive().max(20).optional(),
  })
  .refine((d) => d.pasajeros !== undefined || d.cantidad !== undefined, {
    message:
      "Debe incluir pasajeros (servicio con tarifas) o cantidad (servicio de precio único).",
  });

export const cartSchema = z.object({
  items: z.array(cartLineItemSchema).min(1).max(50),
});

export type Pasajero = z.infer<typeof pasajeroSchema>;
export type CartLineItem = z.infer<typeof cartLineItemSchema>;
export type Cart = z.infer<typeof cartSchema>;

// Alias de compatibilidad: el tipo Cart se usa también en CheckoutScreen.
export type CartItem = CartLineItem;
