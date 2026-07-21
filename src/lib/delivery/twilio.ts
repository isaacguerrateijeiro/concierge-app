import "server-only";
import type { ResultadoEnvio } from "./types";

// Estados de Twilio que consideramos entrega correcta (el mensaje salió de
// Twilio hacia la operadora / WhatsApp) y estados de fallo definitivo.
const ESTADOS_OK = new Set(["sent", "delivered", "read"]);
const ESTADOS_FALLO = new Set(["failed", "undelivered"]);

// Sondeo del estado real: Twilio ACEPTA el mensaje como `queued` y solo después
// lo marca como delivered/failed de forma asíncrona. Sondeamos unas cuantas
// veces para no dar por "enviado" algo que en realidad falla (p. ej. el sandbox
// de WhatsApp devuelve 63015 ~1-2 s después de aceptar el mensaje).
const MAX_SONDEOS = 6;
const ESPERA_MS = 1200;

interface MensajeTwilio {
  sid?: string;
  status?: string;
  error_code?: number | null;
  error_message?: string | null;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Envío de un mensaje vía Twilio (API REST, sin SDK). Sirve para SMS y
// WhatsApp: solo cambian los prefijos de `from`/`to`. Credenciales de
// plataforma en TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN. Tras crear el mensaje
// confirmamos su entrega real sondeando el recurso hasta un estado terminal.
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

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const base = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages`;

  let mensaje: MensajeTwilio;
  try {
    const params = new URLSearchParams({ From: from, To: to, Body: body });
    const res = await fetch(`${base}.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const detalle = await res.text();
      return { ok: false, error: `Twilio ${res.status}: ${detalle.slice(0, 300)}` };
    }
    mensaje = (await res.json()) as MensajeTwilio;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error enviando el mensaje.",
    };
  }

  const msgSid = mensaje.sid ?? null;

  // Sondear el estado real hasta que sea terminal (o agotar los intentos).
  if (msgSid) {
    for (let i = 0; i < MAX_SONDEOS; i++) {
      const estado = mensaje.status ?? "";
      if (ESTADOS_OK.has(estado) || ESTADOS_FALLO.has(estado)) break;
      await esperar(ESPERA_MS);
      try {
        const res = await fetch(`${base}/${msgSid}.json`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        if (!res.ok) break;
        mensaje = (await res.json()) as MensajeTwilio;
      } catch {
        break;
      }
    }
  }

  if (mensaje.status && ESTADOS_FALLO.has(mensaje.status)) {
    return { ok: false, proveedorMsgId: msgSid, error: mensajeError(mensaje) };
  }

  // Entregado, enviado, o aún en cola tras el sondeo: lo damos por aceptado.
  return { ok: true, proveedorMsgId: msgSid };
}

// Traduce el fallo de Twilio a un mensaje entendible para el operador del kiosko.
function mensajeError(mensaje: MensajeTwilio): string {
  const codigo = mensaje.error_code ?? null;
  if (codigo === 63015) {
    return "El destinatario no está unido al sandbox de WhatsApp de Twilio (la sesión caduca a los 3 días). Debe reenviar 'join <código>' al número del sandbox.";
  }
  if (codigo === 63016) {
    return "WhatsApp requiere una plantilla aprobada fuera de la ventana de 24 h.";
  }
  const partes: string[] = [];
  if (codigo) partes.push(`Twilio ${codigo}`);
  if (mensaje.error_message) partes.push(mensaje.error_message);
  return partes.length > 0
    ? partes.join(": ")
    : `El mensaje no se pudo entregar (estado: ${mensaje.status ?? "desconocido"}).`;
}
