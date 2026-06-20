"use client";

import { useEffect, useRef, useState } from "react";
import { Lang } from "./data";
import { useUiText } from "./uiText";
import Icon from "./Icon";
import { obtenerEstadoPedido } from "@/lib/payments/orders";

const SEGUNDOS_AUTO_RESET = 8;

// Pantalla final: confirma el pago consultando el estado (el webhook es la
// fuente de verdad) y se auto-reinicia para dejar el kiosko listo al siguiente.
export default function ConfirmationScreen({
  lang,
  sessionId,
  onReset,
}: {
  lang: Lang;
  sessionId: string;
  onReset: () => void;
}) {
  const t = useUiText();
  const [confirmado, setConfirmado] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sondeo del estado hasta que el webhook marque el pedido como pagado.
  useEffect(() => {
    let activo = true;
    let intentos = 0;
    const intervalo = setInterval(async () => {
      intentos += 1;
      try {
        const estado = await obtenerEstadoPedido(sessionId);
        if (activo && estado?.estado === "paid") {
          setConfirmado(true);
          clearInterval(intervalo);
        }
      } catch {
        // Reintentamos en el siguiente tick.
      }
      // Tras ~20s dejamos de sondear (el pago ya se completó en el iframe).
      if (intentos >= 10) clearInterval(intervalo);
    }, 2000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [sessionId]);

  // Auto-reset cuando el pago queda confirmado.
  useEffect(() => {
    if (!confirmado) return;
    resetTimer.current = setTimeout(onReset, SEGUNDOS_AUTO_RESET * 1000);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [confirmado, onReset]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, background: "var(--bone)", padding: 60, textAlign: "center" }}>
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: confirmado ? "var(--accent)" : "transparent",
          border: confirmado ? "none" : "3px solid var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.4s ease",
        }}
      >
        <Icon name="check" size={72} sw={2.6} stroke={confirmado ? "var(--ink)" : "var(--muted)"} />
      </div>

      <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 56, color: "var(--ink)" }}>
        {confirmado ? t(lang, "paid") : t(lang, "paying")}
      </h1>

      {confirmado && (
        <p style={{ fontFamily: "var(--sans)", fontSize: 22, color: "var(--muted)", maxWidth: 560 }}>
          {t(lang, "paidDesc")}
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="tap"
        style={{ marginTop: 16, background: "var(--ink)", color: "#fff", border: "none", borderRadius: 999, padding: "22px 52px", fontFamily: "var(--sans)", fontWeight: 800, fontSize: 24, cursor: "pointer" }}
      >
        {t(lang, "newOrder")}
      </button>
    </div>
  );
}
