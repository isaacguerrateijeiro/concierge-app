"use client";

import { useEffect, useState } from "react";
import KioskNotice from "@/components/kiosk/KioskNotice";

const RETRY_SECONDS = 10;

// Límite de error del kiosko. Un kiosko es público y desatendido, así que
// nunca debe mostrar un error técnico: enseñamos un mensaje amable y
// reintentamos la reconexión automáticamente, además del botón manual.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [seconds, setSeconds] = useState(RETRY_SECONDS);

  useEffect(() => {
    // Registramos el detalle técnico para diagnóstico, sin mostrarlo al usuario.
    console.error("Kiosk error boundary:", error);
  }, [error]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          reset();
          return RETRY_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reset]);

  return (
    <KioskNotice
      eyebrow="Sin conexión"
      title="Volvemos enseguida"
      message="No hemos podido cargar los servicios en este momento. Estamos reintentando la conexión automáticamente."
    >
      <button
        type="button"
        onClick={reset}
        className="tap"
        style={{
          fontFamily: "var(--sans)",
          fontSize: 18,
          fontWeight: 600,
          color: "#16140F",
          background: "#F2C200",
          border: "none",
          borderRadius: 999,
          padding: "16px 40px",
          cursor: "pointer",
        }}
      >
        Reintentar ahora
      </button>
      <p
        style={{
          marginTop: 20,
          fontFamily: "var(--mono)",
          fontSize: 13,
          letterSpacing: 1,
          color: "rgba(244, 241, 234, 0.45)",
        }}
      >
        Reintento automático en {seconds}s
      </p>
    </KioskNotice>
  );
}
