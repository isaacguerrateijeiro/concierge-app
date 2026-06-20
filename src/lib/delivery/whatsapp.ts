import "server-only";
import type { AdaptadorCanal, Comprobante, ResultadoEnvio } from "./types";
import type { Remitente } from "./config";
import { enviarTwilio } from "./twilio";

// Adaptador de WhatsApp vía Twilio. Mismo transporte que SMS pero con el
// prefijo `whatsapp:` en emisor y destinatario. El número del tenant va en
// entrega_config.remitente.whatsapp_from. En producción WhatsApp exige
// plantillas aprobadas; en sandbox basta con el número de pruebas de Twilio.
export const whatsappAdapter: AdaptadorCanal = {
  canal: "whatsapp",
  async enviar(
    comprobante: Comprobante,
    destino: string | null,
    remitente: Remitente
  ): Promise<ResultadoEnvio> {
    if (!destino) return { ok: false, error: "Falta el teléfono de destino." };
    if (!remitente.whatsapp_from) {
      return { ok: false, error: "El tenant no tiene whatsapp_from configurado." };
    }
    const from = `whatsapp:${remitente.whatsapp_from}`;
    const to = `whatsapp:${destino}`;
    return enviarTwilio(from, to, comprobante.textoPlano);
  },
};
