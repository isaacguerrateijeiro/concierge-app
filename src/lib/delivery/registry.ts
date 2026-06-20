import "server-only";
import type { CanalEntrega } from "@/lib/catalog.schema";
import type { AdaptadorCanal } from "./types";
import { emailAdapter } from "./email";
import { smsAdapter } from "./sms";
import { whatsappAdapter } from "./whatsapp";
import { printAdapter } from "./print";

// Registro de adaptadores por canal. Añadir un canal nuevo es registrar aquí
// su adaptador, sin tocar la lógica de envío.
const ADAPTADORES: Record<CanalEntrega, AdaptadorCanal> = {
  email: emailAdapter,
  sms: smsAdapter,
  whatsapp: whatsappAdapter,
  print: printAdapter,
};

export function adaptadorDe(canal: CanalEntrega): AdaptadorCanal {
  return ADAPTADORES[canal];
}
