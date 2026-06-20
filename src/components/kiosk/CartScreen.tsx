"use client";

import { Lang } from "./data";
import { CatalogService, tx } from "@/lib/catalog.schema";
import { useUiText } from "./uiText";
import { formatearImporte } from "./format";
import Icon from "./Icon";

export interface CartLine {
  service: CatalogService;
  cantidad: number;
}

// Pantalla de revisión del carrito: ajustar cantidades, quitar y pagar.
export default function CartScreen({
  lang,
  lines,
  moneda,
  total,
  onInc,
  onDec,
  onRemove,
  onBack,
  onPay,
}: {
  lang: Lang;
  lines: CartLine[];
  moneda: string;
  total: number;
  onInc: (slug: string) => void;
  onDec: (slug: string) => void;
  onRemove: (slug: string) => void;
  onBack: () => void;
  onPay: () => void;
}) {
  const t = useUiText();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bone)" }}>
      {/* Cabecera */}
      <div style={{ padding: "40px 48px 16px", display: "flex", alignItems: "center", gap: 20 }}>
        <button
          type="button"
          onClick={onBack}
          className="tap"
          style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", color: "var(--ink)" }}
        >
          <Icon name="arrow-left" size={28} sw={2.2} stroke="var(--ink)" />
          <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            {t(lang, "back")}
          </span>
        </button>
      </div>
      <h2 style={{ padding: "0 48px", margin: 0, fontFamily: "var(--serif)", fontSize: 52, color: "var(--ink)" }}>
        {t(lang, "cart")}
      </h2>

      {/* Lista de líneas */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 48px 8px", display: "flex", flexDirection: "column", gap: 16 }}>
        {lines.length === 0 && (
          <p style={{ fontFamily: "var(--sans)", fontSize: 22, color: "var(--muted)" }}>{t(lang, "cartEmpty")}</p>
        )}
        {lines.map(({ service, cantidad }) => {
          const precio = service.precio_desde ?? 0;
          return (
            <div
              key={service.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "22px 26px",
                background: "#fff",
                borderRadius: 22,
                boxShadow: "0 2px 14px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 24, color: "var(--ink)" }}>
                  {tx(service.titulo_i18n, lang)}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--muted)", marginTop: 4 }}>
                  {formatearImporte(precio, moneda, lang)}
                </div>
              </div>

              {/* Controles de cantidad */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <QtyBtn label="−" onClick={() => onDec(service.slug)} />
                <span style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: 26, minWidth: 28, textAlign: "center", color: "var(--ink)" }}>
                  {cantidad}
                </span>
                <QtyBtn label="+" onClick={() => onInc(service.slug)} />
              </div>

              <div style={{ width: 120, textAlign: "right", fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink)" }}>
                {formatearImporte(precio * cantidad, moneda, lang)}
              </div>

              <button
                type="button"
                onClick={() => onRemove(service.slug)}
                className="tap"
                aria-label={t(lang, "remove")}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}
              >
                {t(lang, "remove")}
              </button>
            </div>
          );
        })}
      </div>

      {/* Pie: total + pagar */}
      <div style={{ padding: "24px 48px 40px", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--muted)" }}>
            {t(lang, "total")}
          </span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 46, color: "var(--ink)", lineHeight: 1 }}>
            {formatearImporte(total, moneda, lang)}
          </span>
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={lines.length === 0}
          className="tap"
          style={{
            background: lines.length === 0 ? "var(--muted)" : "var(--ink)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "26px 60px",
            fontFamily: "var(--sans)",
            fontWeight: 800,
            fontSize: 26,
            display: "flex",
            alignItems: "center",
            gap: 16,
            cursor: lines.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Icon name="card" size={28} sw={2.2} stroke="#fff" />
          {t(lang, "pay")}
        </button>
      </div>
    </div>
  );
}

function QtyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap"
      style={{
        width: 52,
        height: 52,
        borderRadius: "50%",
        border: "2px solid var(--ink)",
        background: "transparent",
        color: "var(--ink)",
        fontSize: 30,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}
