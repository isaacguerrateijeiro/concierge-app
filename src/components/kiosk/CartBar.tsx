"use client";

import { Lang } from "./data";
import { useUiText } from "./uiText";
import { formatearImporte } from "./format";
import Icon from "./Icon";

// Barra inferior que aparece en Home cuando hay artículos en el carrito.
// Muestra el número de artículos y el total, y lleva a revisar el carrito.
export default function CartBar({
  lang,
  count,
  total,
  moneda,
  onOpen,
}: {
  lang: Lang;
  count: number;
  total: number;
  moneda: string;
  onOpen: () => void;
}) {
  const t = useUiText();
  if (count <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "20px 44px",
        background: "var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 60,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ color: "#fff", display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>
          {count} {t(lang, "items")}
        </span>
        <span style={{ fontFamily: "var(--serif)", fontSize: 34, lineHeight: 1 }}>
          {formatearImporte(total, moneda, lang)}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="tap"
        style={{
          background: "var(--accent)",
          color: "var(--ink)",
          border: "none",
          borderRadius: 999,
          padding: "22px 44px",
          fontFamily: "var(--sans)",
          fontWeight: 800,
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
        }}
      >
        {t(lang, "viewCart")}
        <Icon name="arrow-right" size={26} sw={2.4} stroke="var(--ink)" />
      </button>
    </div>
  );
}
