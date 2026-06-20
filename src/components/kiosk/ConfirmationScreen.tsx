"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lang } from "./data";
import { useUiText } from "./uiText";
import Icon from "./Icon";
import QrCode from "./QrCode";
import { obtenerEstadoPedido } from "@/lib/payments/orders";
import { enviarComprobante } from "@/lib/delivery/actions";
import type { CanalEntrega } from "@/lib/catalog.schema";

// Sin interacción del cliente, el kiosko se reinicia solo tras este tiempo.
const SEGUNDOS_AUTO_RESET = 45;

type EstadoEnvio = "idle" | "sending" | "sent" | "error";

// Canales que piden un dato de contacto (los demás actúan al instante).
const CANALES_CON_DESTINO: CanalEntrega[] = ["email", "sms", "whatsapp"];

export default function ConfirmationScreen({
  lang,
  sessionId,
  entrega,
  onReset,
}: {
  lang: Lang;
  sessionId: string;
  entrega: { canales: CanalEntrega[]; consentimiento: Record<string, string> };
  onReset: () => void;
}) {
  const t = useUiText();
  const [confirmado, setConfirmado] = useState(false);
  const [reciboToken, setReciboToken] = useState<string | null>(null);
  // origin se fija una vez en el cliente (en SSR no hay window). No es estado
  // que cambie, así que lo inicializamos de forma perezosa (sin efecto).
  const [origin] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.origin : ""
  );
  const [canalSel, setCanalSel] = useState<CanalEntrega | null>(null);
  const [destino, setDestino] = useState("");
  const [estado, setEstado] = useState<EstadoEnvio>("idle");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [interactuando, setInteractuando] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const receiptUrl = useMemo(
    () => (reciboToken && origin ? `${origin}/r/${reciboToken}` : null),
    [reciboToken, origin]
  );

  // Sondeo del estado hasta que el webhook marque el pedido como pagado.
  useEffect(() => {
    let activo = true;
    let intentos = 0;
    const intervalo = setInterval(async () => {
      intentos += 1;
      try {
        const est = await obtenerEstadoPedido(sessionId);
        if (activo && est?.estado === "paid") {
          setConfirmado(true);
          if (est.recibo_token) setReciboToken(est.recibo_token);
          if (est.recibo_token) clearInterval(intervalo);
        }
      } catch {
        // Reintentamos en el siguiente tick.
      }
      if (intentos >= 15) clearInterval(intervalo);
    }, 2000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [sessionId]);

  // Auto-reset cuando el pago queda confirmado, salvo que el cliente interactúe.
  useEffect(() => {
    if (!confirmado || interactuando) return;
    resetTimer.current = setTimeout(onReset, SEGUNDOS_AUTO_RESET * 1000);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [confirmado, interactuando, onReset]);

  const canalesHabilitados = entrega.canales ?? [];
  const consentimiento = entrega.consentimiento?.[lang] ?? entrega.consentimiento?.es ?? "";

  function seleccionarCanal(canal: CanalEntrega) {
    setInteractuando(true);
    setEstado("idle");
    setMensaje(null);
    if (canal === "print") {
      setCanalSel(null);
      if (receiptUrl) window.open(`${receiptUrl}?print=1`, "_blank", "noopener");
      void enviarComprobante({ reciboToken, canal: "print", destino: null });
      return;
    }
    setCanalSel((prev) => (prev === canal ? null : canal));
    setDestino("");
  }

  async function enviar() {
    if (!canalSel || !reciboToken) return;
    setEstado("sending");
    setMensaje(null);
    try {
      const res = await enviarComprobante({ reciboToken, canal: canalSel, destino });
      if (res.ok) {
        setEstado("sent");
      } else {
        setEstado("error");
        setMensaje(res.error ?? t(lang, "deliveryError"));
      }
    } catch {
      setEstado("error");
      setMensaje(t(lang, "deliveryError"));
    }
  }

  const etiquetaCanal: Record<CanalEntrega, string> = {
    email: t(lang, "channelEmail"),
    sms: t(lang, "channelSms"),
    whatsapp: t(lang, "channelWhatsapp"),
    print: t(lang, "channelPrint"),
  };
  const iconoCanal: Record<CanalEntrega, string> = {
    email: "mail",
    sms: "message",
    whatsapp: "message",
    print: "printer",
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background: "var(--bone)",
        padding: 60,
        textAlign: "center",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: confirmado ? "var(--accent)" : "transparent",
          border: confirmado ? "none" : "3px solid var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.4s ease",
          flexShrink: 0,
        }}
      >
        <Icon name="check" size={58} sw={2.6} stroke={confirmado ? "var(--ink)" : "var(--muted)"} />
      </div>

      <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 44, color: "var(--ink)" }}>
        {confirmado ? t(lang, "paid") : t(lang, "paying")}
      </h1>

      {confirmado && receiptUrl && (
        <>
          <p style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 20, color: "var(--ink)", fontWeight: 700 }}>
            {t(lang, "deliveryTitle")}
          </p>

          <QrCode value={receiptUrl} size={200} />
          <p style={{ margin: 0, fontFamily: "var(--sans)", fontSize: 16, color: "var(--muted)" }}>
            {t(lang, "scanQr")}
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {canalesHabilitados.map((canal) => (
              <button
                key={canal}
                type="button"
                onClick={() => seleccionarCanal(canal)}
                className="tap"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: canalSel === canal ? "var(--ink)" : "#fff",
                  color: canalSel === canal ? "#fff" : "var(--ink)",
                  border: "2px solid var(--ink)",
                  borderRadius: 999,
                  padding: "14px 24px",
                  fontFamily: "var(--sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                <Icon name={iconoCanal[canal]} size={20} sw={2} stroke={canalSel === canal ? "#fff" : "var(--ink)"} />
                {etiquetaCanal[canal]}
              </button>
            ))}
          </div>

          {canalSel && CANALES_CON_DESTINO.includes(canalSel) && estado !== "sent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 480 }}>
              <input
                type={canalSel === "email" ? "email" : "tel"}
                value={destino}
                onChange={(e) => {
                  setDestino(e.target.value);
                  setInteractuando(true);
                }}
                placeholder={
                  canalSel === "email" ? t(lang, "emailPlaceholder") : t(lang, "phonePlaceholder")
                }
                style={{
                  padding: "16px 20px",
                  fontSize: 20,
                  fontFamily: "var(--sans)",
                  border: "2px solid var(--line)",
                  borderRadius: 14,
                  outline: "none",
                  textAlign: "center",
                }}
              />
              {consentimiento && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{consentimiento}</p>
              )}
              <button
                type="button"
                onClick={enviar}
                disabled={estado === "sending" || destino.trim().length === 0}
                className="tap"
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 999,
                  padding: "16px 36px",
                  fontFamily: "var(--sans)",
                  fontWeight: 800,
                  fontSize: 20,
                  cursor: "pointer",
                  opacity: estado === "sending" || destino.trim().length === 0 ? 0.6 : 1,
                }}
              >
                {estado === "sending" ? t(lang, "sending") : t(lang, "send")}
              </button>
            </div>
          )}

          {estado === "sent" && (
            <p style={{ margin: 0, color: "var(--ink)", fontWeight: 700, fontSize: 18 }}>
              {t(lang, "sent")}
            </p>
          )}
          {estado === "error" && mensaje && (
            <p style={{ margin: 0, color: "#b00020", fontSize: 16 }}>{mensaje}</p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={onReset}
        className="tap"
        style={{
          marginTop: 8,
          background: confirmado ? "transparent" : "var(--ink)",
          color: confirmado ? "var(--ink)" : "#fff",
          border: confirmado ? "2px solid var(--ink)" : "none",
          borderRadius: 999,
          padding: "16px 44px",
          fontFamily: "var(--sans)",
          fontWeight: 800,
          fontSize: 20,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {t(lang, "newOrder")}
      </button>
    </div>
  );
}
