import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { fetchRecibo, type Recibo } from "@/lib/recibo";
import { qrSvg } from "@/lib/vouchers/qr";
import PrintButton from "./PrintButton";
import AutoPrint from "./AutoPrint";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comprobante",
  robots: { index: false, follow: false },
};

// Textos del recibo: bilingües con respaldo. La página es pública y vive fuera
// del kiosko, así que lleva su propio diccionario mínimo (es/en) y elige por el
// idioma del pedido.
const TEXTOS: Record<string, Record<string, string>> = {
  es: {
    receipt: "Comprobante",
    item: "Concepto",
    qty: "Cant.",
    amount: "Importe",
    total: "Total",
    code: "Código",
    scan: "Muestra este código en el mostrador",
    print: "Imprimir",
    thanks: "Gracias por tu compra",
    ref: "Referencia",
  },
  en: {
    receipt: "Receipt",
    item: "Item",
    qty: "Qty",
    amount: "Amount",
    total: "Total",
    code: "Code",
    scan: "Show this code at the desk",
    print: "Print",
    thanks: "Thanks for your purchase",
    ref: "Reference",
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

function applyBranding(recibo: Recibo): React.CSSProperties {
  const colors =
    (recibo.tenant.branding as { colors?: Record<string, string> }).colors ?? {};
  const vars: Record<string, string> = {
    "--r-ink": colors.ink ?? "#16140F",
    "--r-bone": colors.bone ?? "#F4F1EA",
    "--r-accent": colors.accent ?? "#F2C200",
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
  const qrs = await Promise.all(
    recibo.items.map((it) =>
      it.voucher ? qrSvg(it.voucher.token) : Promise.resolve(null)
    )
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
        .ticket { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.10); overflow: hidden; }
        .ticket-head { background: var(--r-ink); color: #fff; padding: 28px 24px; text-align: center; }
        .ticket-body { padding: 24px; }
        .voucher-qr svg { width: 128px; height: 128px; display: block; }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          .ticket { box-shadow: none; border-radius: 0; max-width: 100%; }
          main { padding: 0; background: #fff; }
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
        </div>

        <div className="ticket-body">
          {recibo.items.map((it, i) => (
            <div
              key={i}
              style={{
                padding: "18px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 16,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {it.cantidad}× {it.titulo}
                </span>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {money(it.importe, recibo.moneda, lang)}
                </span>
              </div>

              {it.voucher && qrs[i] && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    className="voucher-qr"
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: qrs[i] as string }}
                  />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
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
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                      {t("scan")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 18,
              fontSize: 20,
            }}
          >
            <span style={{ fontFamily: "var(--serif)", fontWeight: 700 }}>
              {t("total")}
            </span>
            <span style={{ fontWeight: 800 }}>
              {money(recibo.importe_total, recibo.moneda, lang)}
            </span>
          </div>

          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              color: "var(--muted)",
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
