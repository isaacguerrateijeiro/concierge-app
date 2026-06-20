import "server-only";
import type { AdaptadorCanal, ResultadoEnvio } from "./types";

// Adaptador de IMPRESIÓN. No envía nada: la impresión ocurre en el cliente
// (window.print() sobre /r/[token], que dirige a la impresora del kiosko).
// Este adaptador solo confirma para registrar la entrega en auditoría.
export const printAdapter: AdaptadorCanal = {
  canal: "print",
  async enviar(): Promise<ResultadoEnvio> {
    return { ok: true, proveedorMsgId: null };
  },
};
