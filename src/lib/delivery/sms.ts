import "server-only";
import type { AdaptadorCanal, Comprobante, ResultadoEnvio } from "./types";
import type { Remitente } from "./config";
import { enviarTwilio } from "./twilio";

// Adaptador de SMS vía Twilio. El número emisor del tenant va en
// entrega_config.remitente.sms_from.
export const smsAdapter: AdaptadorCanal = {
  canal: "sms",
  async enviar(
    comprobante: Comprobante,
    destino: string | null,
    remitente: Remitente
  ): Promise<ResultadoEnvio> {
    if (!destino) return { ok: false, error: "Falta el teléfono de destino." };
    if (!remitente.sms_from) {
      return { ok: false, error: "El tenant no tiene sms_from configurado." };
    }
    return enviarTwilio(remitente.sms_from, destino, comprobante.textoPlano);
  },
};
