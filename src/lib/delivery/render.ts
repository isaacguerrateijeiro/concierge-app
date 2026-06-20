import type { Comprobante } from "./types";

// ============================================================
// Render del mensaje del comprobante (función pura, testeable).
// Genera asunto, texto plano (sms/whatsapp) y HTML (email) bilingües.
// ============================================================

const TEXTOS: Record<string, { asunto: string; intro: string; ver: string; total: string }> = {
  es: {
    asunto: "Tu comprobante de compra",
    intro: "Gracias por tu compra. Aquí tienes tu comprobante",
    ver: "Ver comprobante",
    total: "Total",
  },
  en: {
    asunto: "Your purchase receipt",
    intro: "Thanks for your purchase. Here is your receipt",
    ver: "View receipt",
    total: "Total",
  },
};

export interface DatosComprobante {
  tenantNombre: string;
  url: string;
  totalFormateado: string;
  lang: string;
}

export function renderComprobante(datos: DatosComprobante): Comprobante {
  const t = TEXTOS[datos.lang] ?? TEXTOS.es;
  const asunto = `${t.asunto} · ${datos.tenantNombre}`;
  const textoPlano = `${t.intro} (${t.total}: ${datos.totalFormateado}):\n${datos.url}`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#16140F;padding:24px">
<h2 style="margin:0 0 8px">${escapeHtml(datos.tenantNombre)}</h2>
<p style="margin:0 0 16px">${escapeHtml(t.intro)} (${escapeHtml(t.total)}: ${escapeHtml(datos.totalFormateado)}).</p>
<p><a href="${escapeAttr(datos.url)}" style="display:inline-block;background:#16140F;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700">${escapeHtml(t.ver)}</a></p>
<p style="color:#888;font-size:13px;margin-top:16px">${escapeAttr(datos.url)}</p>
</body></html>`;
  return { url: datos.url, asunto, textoPlano, html, tenantNombre: datos.tenantNombre };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
