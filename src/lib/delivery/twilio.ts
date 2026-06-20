import "server-only";
import type { ResultadoEnvio } from "./types";

// Envío de un mensaje vía Twilio (API REST, sin SDK). Sirve para SMS y
// WhatsApp: solo cambian los prefijos de `from`/`to`. Credenciales de
// plataforma en TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.
export async function enviarTwilio(
  from: string,
  to: string,
  body: string
): Promise<ResultadoEnvio> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { ok: false, error: "Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN." };
  }

  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    if (!res.ok) {
      const detalle = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${detalle.slice(0, 300)}` };
    }
    const json = (await res.json()) as { sid?: string };
    return { ok: true, proveedorMsgId: json.sid ?? null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error enviando el mensaje.",
    };
  }
}
