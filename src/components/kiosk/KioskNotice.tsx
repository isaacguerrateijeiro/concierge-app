import type { ReactNode } from "react";

// Pantalla a pantalla completa para estados especiales del kiosko
// (cargando, error, sin conexión). Mantiene la estética de marca y centra
// el contenido sobre fondo oscuro, igual que el resto del kiosko.
export default function KioskNotice({
  eyebrow,
  title,
  message,
  children,
  pulse = false,
}: {
  eyebrow?: string;
  title: string;
  message?: string;
  children?: ReactNode;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <div
        className="fade-in"
        style={{
          maxWidth: 560,
          textAlign: "center",
          color: "#F4F1EA",
          fontFamily: "var(--sans)",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#F2C200",
            margin: "0 auto 28px",
            animation: pulse ? "pulseRing 1.6s ease-out infinite" : undefined,
          }}
        />
        {eyebrow ? (
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 14,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#F2C200",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 44,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {title}
        </h1>
        {message ? (
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: "rgba(244, 241, 234, 0.7)",
              marginBottom: 32,
            }}
          >
            {message}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
