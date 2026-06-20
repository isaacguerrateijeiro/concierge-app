import { z } from "zod";
import { canalEntregaSchema, type CanalEntrega } from "@/lib/catalog.schema";

// ============================================================
// Validación de envío del comprobante (funciones puras, testeables).
//  - El destino se valida según el canal (email vs teléfono E.164).
//  - Topes anti-abuso por pedido (total y por canal).
//  - Ventana temporal: solo se permite enviar poco después del pago.
// ============================================================

// Tope total de envíos por pedido (suma de todos los canales).
export const MAX_ENVIOS_POR_PEDIDO = 8;
// Tope de envíos por canal y pedido.
export const MAX_ENVIOS_POR_CANAL = 3;
// Ventana desde el pago en la que se permite enviar (en horas).
export const VENTANA_ENVIO_HORAS = 24;

// Teléfono en formato E.164: + y de 7 a 15 dígitos, sin empezar por 0.
export const telefonoSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Teléfono no válido (formato internacional +34…).");

export const emailSchema = z.string().trim().toLowerCase().email("Email no válido.");

export interface DestinoValido {
  ok: true;
  valor: string | null;
}
export interface DestinoInvalido {
  ok: false;
  error: string;
}
export type ResultadoDestino = DestinoValido | DestinoInvalido;

// Valida el destino según el canal. En "print" no hay destino.
export function validarDestino(
  canal: CanalEntrega,
  destino: unknown
): ResultadoDestino {
  if (canal === "print") return { ok: true, valor: null };
  if (canal === "email") {
    const r = emailSchema.safeParse(destino);
    return r.success
      ? { ok: true, valor: r.data }
      : { ok: false, error: r.error.issues[0]?.message ?? "Email no válido." };
  }
  // sms / whatsapp
  const r = telefonoSchema.safeParse(destino);
  return r.success
    ? { ok: true, valor: r.data }
    : { ok: false, error: r.error.issues[0]?.message ?? "Teléfono no válido." };
}

// ¿Está el canal habilitado para el tenant?
export function canalHabilitado(
  habilitados: CanalEntrega[],
  canal: CanalEntrega
): boolean {
  return habilitados.includes(canal);
}

// ¿Se supera algún tope anti-abuso? `enviosCanal` cuenta los del mismo canal.
export function superaTopes(
  totalEnvios: number,
  enviosCanal: number
): boolean {
  return (
    totalEnvios >= MAX_ENVIOS_POR_PEDIDO || enviosCanal >= MAX_ENVIOS_POR_CANAL
  );
}

// ¿El pago es lo bastante reciente para permitir el envío?
export function dentroDeVentana(
  paidAt: string | null,
  ahora: Date = new Date()
): boolean {
  if (!paidAt) return false;
  const pagado = new Date(paidAt).getTime();
  if (Number.isNaN(pagado)) return false;
  const limite = pagado + VENTANA_ENVIO_HORAS * 3600 * 1000;
  return ahora.getTime() <= limite;
}

// Esquema de la acción (lo que llega del cliente).
export const enviarComprobanteSchema = z.object({
  reciboToken: z.string().min(10),
  canal: canalEntregaSchema,
  destino: z.string().nullable().optional(),
});
export type EnviarComprobanteInput = z.infer<typeof enviarComprobanteSchema>;
