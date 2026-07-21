import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { fetchRecibo, type Recibo, type ReciboProveedor } from "@/lib/recibo";
import { qrSvg } from "@/lib/vouchers/qr";
import PrintButton from "./PrintButton";
import AutoPrint from "./AutoPrint";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Factura simplificada",
  robots: { index: false, follow: false },
};

// Textos del recibo: bilingües con respaldo. La página es pública y vive fuera
// del kiosko, así que lleva su propio diccionario mínimo (es/en) y elige por el
// idioma del pedido.
const TEXTOS: Record<string, Record<string, string>> = {
  es: {
    receipt: "Factura simplificada",
    issuer: "Emisor",
    nif: "NIF",
    invoiceNo: "Nº factura",
    date: "Fecha",
    qty: "Cant.",
    amount: "Importe",
    taxBase: "Base imponible",
    vat: "IVA",
    total: "Total",
    grandTotal: "Total pagado",
    code: "Código",
    scan: "Muestra este código al proveedor",
    print: "Imprimir / Descargar",
    thanks: "Gracias por tu compra",
    ref: "Referencia",
    support: "Atención al cliente",
    cancellation: "Política de cancelación",
    terms: "Términos",
    privacy: "Privacidad",
    vatIncluded: "IVA incluido",
    meetingPoint: "Punto de encuentro",
    serviceDate: "Fecha del servicio",
    legalNote:
      "Factura simplificada emitida por cada proveedor. Conserva este documento.",
  },
  en: {
    receipt: "Simplified invoice",
    issuer: "Issuer",
    nif: "Tax ID",
    invoiceNo: "Invoice no.",
    date: "Date",
    qty: "Qty",
    amount: "Amount",
    taxBase: "Taxable base",
    vat: "VAT",
    total: "Total",
    grandTotal: "Total paid",
    code: "Code",
    scan: "Show this code to the provider",
    print: "Print / Download",
    thanks: "Thanks for your purchase",
    ref: "Reference",
    support: "Customer support",
    cancellation: "Cancellation policy",
    terms: "Terms",
    privacy: "Privacy",
    vatIncluded: "VAT included",
    meetingPoint: "Meeting point",
    serviceDate: "Service date",
    legalNote:
      "Simplified invoice issued by each provider. Please keep this document.",
  },
};

const INTL_LOCALES: Record<string, string> = { es: "es-ES", en: "en-GB" };

function money(amount: number, moneda: string, lang: string): string {
  try {
    return new Intl.NumberFormat(INTL_LOCALES[lang] ?? "es-ES", {
      style: "currency",
      currency: moneda,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${moneda}`;
  }
}

// Texto que puede venir como cadena o como {es,en}. Resuelve por idioma.
function localized(
  val: string | Record<string, string> | null | undefined,
  lang: string
): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  return val[lang] ?? val.es ?? val.en ?? null;
}

function applyBranding(recibo: Recibo): React.CSSProperties {
  const colors =
    (recibo.tenant.branding as { colors?: Record<string, string> }).colors ?? {};
  const vars: Record<string, string> = {
    "--r-ink": colors.ink ?? "#16140F",
    "--r-bone": colors.bone ?? "#F4F1EA",
    "--r-accent": colors.accent ?? "#F2C200",
    "--r-line": "#e7e2d8",
    "--r-muted": "#7a7468",
  };
  return vars as React.CSSProperties;
}

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const recibo = await fetchRecibo(token);
  if (!recibo) notFound();

  const lang = recibo.idioma && TEXTOS[recibo.idioma] ? recibo.idioma : "es";
  const t = (k: string) => TEXTOS[lang]?.[k] ?? TEXTOS.es[k] ?? k;
  const fecha = new Date(recibo.created_at).toLocaleString(
    INTL_LOCALES[lang] ?? "es-ES",
    { dateStyle: "long", timeStyle: "short" }
  );
  const marca = (
    (recibo.tenant.branding as { mark?: string }).mark ??
    recibo.tenant.nombre.charAt(0)
  ).toUpperCase();

  // QR por voucher (SVG inline): contenido = token del voucher (canje futuro).
  // Pre-generamos un mapa token -> SVG para no repetir trabajo.
  const tokens = recibo.proveedores
    .flatMap((p) => p.items)
    .map((it) => it.voucher?.token)
    .filter((x): x is string => !!x);
  const qrPorToken = new Map<string, string>();
  await Promise.all(
    Array.from(new Set(tokens)).map(async (tk) => {
      qrPorToken.set(tk, await qrSvg(tk));
    })
  );

  return (
    <main
      style={{
        ...applyBranding(recibo),
        minHeight: "100vh",
        background: "var(--r-bone)",
        display: "flex",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "var(--sans)",
        color: "var(--r-ink)",
      }}
    >
      <Suspense fallback={null}>
        <AutoPrint />
      </Suspense>
      <style>{`
        .ticket { width: 100%; max-width: 460px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); overflow: hidden; }
        .ticket-head { background: var(--r-ink); color: #fff; padding: 28px 24px; text-align: center; }
        .ticket-body { padding: 24px; }
        .emisor { border: 1px solid var(--r-line); border-radius: 12px; padding: 16px; margin-bottom: 18px; }
        .emisor + .emisor { margin-top: 0; }
        .row { display: flex; justify-content: space-between; gap: 12px; }
        .muted { color: var(--r-muted); }
        .voucher-qr svg { width: 116px; height: 116px; display: block; }
        .lineas { margin: 12px 0; }
        .linea { padding: 12px 0; border-bottom: 1px dashed var(--r-line); }
        .linea:last-child { border-bottom: none; }
        .iva-table { width: 100%; font-size: 13px; margin-top: 10px; border-top: 1px solid var(--r-line); padding-top: 10px; }
        .iva-table .row { padding: 2px 0; }
        a { color: inherit; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .ticket { box-shadow: none; border-radius: 0; max-width: 100%; }
          main { padding: 0; background: #fff; }
          .emisor { break-inside: avoid; }
        }
      `}</style>

      <div className="ticket">
        <div className="ticket-head">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--r-accent)",
              color: "var(--r-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--serif)",
              fontSize: 28,
              fontWeight: 700,
              margin: "0 auto 12px",
            }}
          >
            {marca}
          </div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 700 }}>
            {recibo.tenant.nombre}
          </div>
          <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>
            {t("receipt")} · {fecha}
          </div>
          {recibo.referencia && (
            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 2 }}>
              {t("ref")}: <strong>{recibo.referencia}</strong>
            </div>
          )}
        </div>

        <div className="ticket-body">
          {recibo.proveedores.map((prov, idx) => (
            <Emisor
              key={prov.slug + idx}
              prov={prov}
              moneda={recibo.moneda}
              lang={lang}
              t={t}
              qrPorToken={qrPorToken}
            />
          ))}

          <div
            className="row"
            style={{
              alignItems: "baseline",
              marginTop: 18,
              fontSize: 20,
            }}
          >
            <span style={{ fontFamily: "var(--serif)", fontWeight: 700 }}>
              {t("grandTotal")}
            </span>
            <span style={{ fontWeight: 800 }}>
              {money(recibo.importe_total, recibo.moneda, lang)}
            </span>
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 12,
              color: "var(--r-muted)",
              textAlign: "center",
            }}
          >
            {t("legalNote")}
          </div>

          <div
            style={{
              marginTop: 18,
              textAlign: "center",
              color: "var(--r-muted)",
              fontSize: 13,
            }}
          >
            {t("thanks")}
          </div>

          <div
            className="no-print"
            style={{ marginTop: 20, display: "flex", justifyContent: "center" }}
          >
            <PrintButton label={t("print")} />
          </div>
        </div>
      </div>
    </main>
  );
}

function Emisor({
  prov,
  moneda,
  lang,
  t,
  qrPorToken,
}: {
  prov: ReciboProveedor;
  moneda: string;
  lang: string;
  t: (k: string) => string;
  qrPorToken: Map<string, string>;
}) {
  const emisorNombre = prov.emisor.razon_social || prov.nombre;
  const cancelacion = localized(prov.cancelacion, lang);
  const fac = prov.factura;
  const facFecha = fac
    ? new Date(fac.fecha).toLocaleDateString(INTL_LOCALES[lang] ?? "es-ES", {
        dateStyle: "long",
      })
    : null;

  return (
    <div className="emisor">
      {/* Cabecera del emisor (datos fiscales) */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{emisorNombre}</div>
        {prov.emisor.nif && (
          <div className="muted" style={{ fontSize: 12 }}>
            {t("nif")}: {prov.emisor.nif}
          </div>
        )}
        {prov.emisor.domicilio && (
          <div className="muted" style={{ fontSize: 12 }}>
            {prov.emisor.domicilio}
          </div>
        )}
        {fac && (
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {t("invoiceNo")}: <strong>{fac.referencia}</strong>
            {facFecha ? ` · ${facFecha}` : ""}
          </div>
        )}
      </div>

      {/* Líneas */}
      <div className="lineas">
        {prov.items.map((it, i) => {
          const qr = it.voucher ? qrPorToken.get(it.voucher.token) : null;
          return (
            <div className="linea" key={i}>
              <div className="row" style={{ fontSize: 15 }}>
                <span style={{ fontWeight: 600 }}>
                  {it.cantidad}× {it.titulo}
                </span>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {money(it.importe, moneda, lang)}
                </span>
              </div>
              {it.iva_tipo !== null && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {money(it.precio_unitario, moneda, lang)} · {t("vat")} {it.iva_tipo}%
                </div>
              )}
              {it.fecha_servicio && (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t("serviceDate")}: <strong>{it.fecha_servicio}</strong>
                </div>
              )}
              {localized(it.punto_encuentro, lang) && (
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t("meetingPoint")}: <strong>{localized(it.punto_encuentro, lang)}</strong>
                </div>
              )}
              {it.voucher && qr && (
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    className="voucher-qr"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: qr }}
                  />
                  <div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {t("code")}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                    >
                      {it.voucher.codigo}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {t("scan")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desglose de IVA + total del emisor */}
      {fac && (
        <div className="iva-table">
          <div className="row">
            <span className="muted">{t("taxBase")}</span>
            <span>{money(fac.base_imponible, moneda, lang)}</span>
          </div>
          {fac.desglose_iva.map((d, i) => (
            <div className="row" key={i}>
              <span className="muted">
                {t("vat")} ({d.tipo}%)
              </span>
              <span>{money(d.cuota, moneda, lang)}</span>
            </div>
          ))}
          <div
            className="row"
            style={{ marginTop: 6, fontWeight: 700, fontSize: 15 }}
          >
            <span>{t("total")}</span>
            <span>{money(fac.total, moneda, lang)}</span>
          </div>
        </div>
      )}

      {/* Soporte / cancelación / legales del emisor */}
      {(prov.soporte.email || prov.soporte.telefono) && (
        <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          <strong>{t("support")}:</strong>{" "}
          {prov.soporte.email && (
            <a href={`mailto:${prov.soporte.email}`}>{prov.soporte.email}</a>
          )}
          {prov.soporte.email && prov.soporte.telefono ? " · " : ""}
          {prov.soporte.telefono && (
            <a href={`tel:${prov.soporte.telefono}`}>{prov.soporte.telefono}</a>
          )}
        </div>
      )}
      {cancelacion && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          <strong>{t("cancellation")}:</strong> {cancelacion}
        </div>
      )}
      {(prov.terminos_url || prov.privacidad_url) && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          {prov.terminos_url && (
            <a href={prov.terminos_url} target="_blank" rel="noreferrer">
              {t("terms")}
            </a>
          )}
          {prov.terminos_url && prov.privacidad_url ? " · " : ""}
          {prov.privacidad_url && (
            <a href={prov.privacidad_url} target="_blank" rel="noreferrer">
              {t("privacy")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
