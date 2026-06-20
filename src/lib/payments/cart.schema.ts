import { z } from "zod";

// Esquema del carrito que el kiosko envía al servidor. SOLO contiene QUÉ
// servicios y CUÁNTOS; nunca precios. El servidor recalcula importes desde la
// base de datos para que el cliente no pueda manipular lo que paga.
export const cartItemSchema = z.object({
  service_slug: z.string().min(1),
  cantidad: z.number().int().positive().max(20),
});

export const cartSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
