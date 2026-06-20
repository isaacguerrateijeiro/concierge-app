import type { Comprobante } from "./types";

// ============================================================
// Render del mensaje del comprobante (función pura, testeable).
// Genera asunto, texto plano (sms/whatsapp) y HTML (email) bilingües, con el
// detalle de la factura simplificada por proveedor: líneas, desglose de IVA,
// total, soporte, cancelación y enlaces legales. Los importes llegan ya
// formateados desde el llamador (la función no hace IO ni formato de moneda).
// ============================================================

const TEXTOS: Record<
  string,
  {
    asunto: string;
    intro: string;
    ver: string;
    total: string;
    ref: string;
    invoice: string;
    taxBase: string;
    vat: string;
    support: string;
    cancellation: string;
    terms: string;
    privacy: string;
    legal: string;
  }
> = {
  es: {
    asunto: "Tu factura simplificada",
    intro: "Gracias por tu compra. Aquí tienes el detalle de tu factura simplificada",
    ver: "Ver / descargar comprobante",
    total: "Total",
    ref: "Referencia",
    invoice: "Nº factura",
    taxBase: "Base imponible",
    vat: "IVA",
    support: "Atención al cliente",
    cancellation: "Política de cancelación",
    terms: "Términos",
    privacy: "Privacidad",
    legal: "Factura simplificada emitida por cada proveedor. Conserva este documento.",
  },
  en: {
    asunto: "Your simplified invoice",
    intro: "Thanks for your purchase. Here is your simplified invoice detail",
    ver: "View / download receipt",
    total: "Total",
    ref: "Reference",
    invoice: "Invoice no.",
    taxBase: "Taxable base",
    vat: "VAT",
    support: "Customer support",
    cancellation: "Cancellation policy",
    terms: "Terms",
    privacy: "Privacy",
    legal: "Simplified invoice issued by each provider. Please keep this document.",
  },
};

export interface LineaMsg {
  titulo: string;
  cantidad: number;
  importeFmt: string;
  ivaTipo: number | null;
}

export interface DesgloseMsg {
  tipo: number;
  cuotaFmt: string;
}

export interface ProveedorMsg {
  emisor: string;
  nif: string | null;
  facturaRef: string | null;
  lineas: LineaMsg[];
  baseFmt: string | null;
  desglose: DesgloseMsg[];
  totalFmt: string | null;
  soporteEmail: string | null;
  soporteTelefono: string | null;
  cancelacion: string | null;
  terminosUrl: string | null;
  privacidadUrl: string | null;
}

export interface DatosComprobante {
  tenantNombre: string;
  url: string;
  referencia: string | null;
  totalFormateado: string;
  lang: string;
  proveedores: ProveedorMsg[];
  replyTo: string | null;
}

export function renderComprobante(datos: DatosComprobante): Comprobante {
  const t = TEXTOS[datos.lang] ?? TEXTOS.es;
  const refTxt = datos.referencia ? `${t.ref}: ${datos.referencia}` : "";
  const asunto = datos.referencia
    ? `${t.asunto} ${datos.referencia} · ${datos.tenantNombre}`
    : `${t.asunto} · ${datos.tenantNombre}`;

  // Soporte resumido para SMS/WhatsApp (primer contacto disponible).
  const soporte =
    datos.replyTo ??
    datos.proveedores.find((p) => p.soporteEmail)?.soporteEmail ??
    datos.proveedores.find((p) => p.soporteTelefono)?.soporteTelefono ??
    null;

  // Texto plano (SMS/WhatsApp): conciso pero completo (emisor/tenant, ref,
  // total, soporte y enlace al detalle completo).
  const lineasTexto = [
    `${datos.tenantNombre}${datos.referencia ? ` · ${datos.referencia}` : ""}`,
    `${t.total}: ${datos.totalFormateado}`,
    soporte ? `${t.support}: ${soporte}` : null,
    datos.url,
  ].filter((x): x is string => !!x);
  const textoPlano = lineasTexto.join("\n");

  const html = renderHtml(datos, t, refTxt);

  return {
    url: datos.url,
    asunto,
    textoPlano,
    html,
    tenantNombre: datos.tenantNombre,
    replyTo: datos.replyTo,
  };
}

function renderHtml(
  datos: DatosComprobante,
  t: (typeof TEXTOS)["es"],
  refTxt: string
): string {
  const bloquesProveedor = datos.proveedores
    .map((p) => {
      const lineas = p.lineas
        .map(
          (l) =>
            `<tr><td style="padding:6px 0">${l.cantidad}× ${escapeHtml(
              l.titulo
            )}${
              l.ivaTipo !== null
                ? ` <span style="color:#888;font-size:12px">(${t.vat} ${l.ivaTipo}%)</span>`
                : ""
            }</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${escapeHtml(
              l.importeFmt
            )}</td></tr>`
        )
        .join("");
      const desglose = p.desglose
        .map(
          (d) =>
            `<tr><td style="padding:2px 0;color:#888;font-size:13px">${t.vat} (${d.tipo}%)</td><td style="padding:2px 0;text-align:right;color:#888;font-size:13px">${escapeHtml(
              d.cuotaFmt
            )}</td></tr>`
        )
        .join("");
      const soporte =
        p.soporteEmail || p.soporteTelefono
          ? `<p style="margin:8px 0 0;color:#666;font-size:13px"><strong>${t.support}:</strong> ${[
              p.soporteEmail
                ? `<a href="mailto:${escapeAttr(p.soporteEmail)}">${escapeHtml(
                    p.soporteEmail
                  )}</a>`
                : "",
              p.soporteTelefono ? escapeHtml(p.soporteTelefono) : "",
            ]
              .filter(Boolean)
              .join(" · ")}</p>`
          : "";
      const cancel = p.cancelacion
        ? `<p style="margin:6px 0 0;color:#666;font-size:13px"><strong>${t.cancellation}:</strong> ${escapeHtml(
            p.cancelacion
          )}</p>`
        : "";
      const legales =
        p.terminosUrl || p.privacidadUrl
          ? `<p style="margin:6px 0 0;font-size:13px">${[
              p.terminosUrl
                ? `<a href="${escapeAttr(p.terminosUrl)}">${t.terms}</a>`
                : "",
              p.privacidadUrl
                ? `<a href="${escapeAttr(p.privacidadUrl)}">${t.privacy}</a>`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}</p>`
          : "";
      return `<div style="border:1px solid #e7e2d8;border-radius:12px;padding:16px;margin:0 0 16px">
<div style="font-weight:700">${escapeHtml(p.emisor)}</div>
${p.nif ? `<div style="color:#888;font-size:12px">NIF: ${escapeHtml(p.nif)}</div>` : ""}
${p.facturaRef ? `<div style="color:#888;font-size:12px">${t.invoice}: <strong>${escapeHtml(p.facturaRef)}</strong></div>` : ""}
<table style="width:100%;border-collapse:collapse;margin-top:10px">${lineas}</table>
${p.totalFmt ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;border-top:1px solid #e7e2d8;padding-top:8px">${p.baseFmt ? `<tr><td style="padding:2px 0;color:#888;font-size:13px">${t.taxBase}</td><td style="padding:2px 0;text-align:right;color:#888;font-size:13px">${escapeHtml(p.baseFmt)}</td></tr>` : ""}${desglose}<tr><td style="padding:6px 0;font-weight:700">${t.total}</td><td style="padding:6px 0;text-align:right;font-weight:700">${escapeHtml(p.totalFmt)}</td></tr></table>` : ""}
${soporte}${cancel}${legales}
</div>`;
    })
    .join("");

  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#16140F;padding:24px;max-width:560px;margin:0 auto">
<h2 style="margin:0 0 4px">${escapeHtml(datos.tenantNombre)}</h2>
${refTxt ? `<p style="margin:0 0 12px;color:#666">${escapeHtml(refTxt)}</p>` : ""}
<p style="margin:0 0 16px">${escapeHtml(t.intro)}.</p>
${bloquesProveedor}
<table style="width:100%;border-collapse:collapse;margin:4px 0 16px">
<tr><td style="font-size:18px;font-weight:800">${t.total}</td><td style="font-size:18px;font-weight:800;text-align:right">${escapeHtml(datos.totalFormateado)}</td></tr>
</table>
<p><a href="${escapeAttr(datos.url)}" style="display:inline-block;background:#16140F;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700">${escapeHtml(t.ver)}</a></p>
<p style="color:#888;font-size:13px;margin-top:16px">${escapeHtml(t.legal)}</p>
<p style="color:#888;font-size:12px;margin-top:4px">${escapeAttr(datos.url)}</p>
</body></html>`;
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
