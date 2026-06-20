import type { CanalEntrega } from "@/lib/catalog.schema";
import type { Remitente } from "./config";

// ============================================================
// Abstracción de canal de entrega del comprobante.
// Cada canal (email/sms/whatsapp/print) implementa `enviar`. Así añadir un
// canal nuevo no toca el resto del sistema (open/closed).
// ============================================================

export type { CanalEntrega } from "@/lib/catalog.schema";

// Lo que se entrega: un enlace al recibo público + textos ya renderizados.
export interface Comprobante {
  url: string; // enlace a /r/[recibo_token]
  asunto: string; // asunto (email)
  textoPlano: string; // cuerpo en texto (sms/whatsapp y fallback de email)
  html: string; // cuerpo en HTML (email)
  tenantNombre: string;
  replyTo?: string | null; // buzón real de soporte (email): nunca noreply@
}

export interface ResultadoEnvio {
  ok: boolean;
  proveedorMsgId?: string | null;
  error?: string | null;
}

// Contrato de un adaptador de canal. `destino` es el email/teléfono; en print
// es ignorado (se imprime en cliente y el adaptador solo confirma).
export interface AdaptadorCanal {
  readonly canal: CanalEntrega;
  enviar(
    comprobante: Comprobante,
    destino: string | null,
    remitente: Remitente
  ): Promise<ResultadoEnvio>;
}
