import "server-only";
import type { AdaptadorCanal, Comprobante, ResultadoEnvio } from "./types";
import type { Remitente } from "./config";

// Adaptador de EMAIL vía Resend (API REST, sin SDK). La clave de plataforma
// vive en RESEND_API_KEY; la identidad de remitente (from/nombre) la pone el
// tenant en entrega_config.remitente.
export const emailAdapter: AdaptadorCanal = {
  canal: "email",
  async enviar(
    comprobante: Comprobante,
    destino: string | null,
    remitente: Remitente
  ): Promise<ResultadoEnvio> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Falta RESEND_API_KEY en el entorno." };
    }
    if (!destino) return { ok: false, error: "Falta el email de destino." };
    if (!remitente.email_from) {
      return { ok: false, error: "El tenant no tiene email_from configurado." };
    }

    const from = remitente.email_nombre
      ? `${remitente.email_nombre} <${remitente.email_from}>`
      : remitente.email_from;

    // Reply-To al buzón real de soporte (nunca noreply@): si el cliente
    // responde, llega a atención al cliente del proveedor/tenant.
    const payload: Record<string, unknown> = {
      from,
      to: [destino],
      subject: comprobante.asunto,
      html: comprobante.html,
      text: comprobante.textoPlano,
    };
    if (comprobante.replyTo) {
      payload.reply_to = comprobante.replyTo;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detalle = await res.text();
        return { ok: false, error: `Resend ${res.status}: ${detalle.slice(0, 300)}` };
      }
      const json = (await res.json()) as { id?: string };
      return { ok: true, proveedorMsgId: json.id ?? null };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Error enviando el email.",
      };
    }
  },
};
