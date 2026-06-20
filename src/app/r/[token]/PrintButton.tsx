"use client";

// Botón de impresión del recibo. Usa la impresión del navegador (window.print),
// que en el kiosko se dirige a la impresora térmica del sistema. No se muestra
// al imprimir (clase no-print).
export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        background: "var(--r-ink)",
        color: "#fff",
        border: "none",
        borderRadius: 999,
        padding: "14px 32px",
        fontFamily: "var(--sans)",
        fontWeight: 700,
        fontSize: 16,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
