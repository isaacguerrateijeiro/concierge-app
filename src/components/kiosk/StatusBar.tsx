"use client";

import Icon from "./Icon";
import { Lang, ui } from "./data";

interface StatusBarProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  locales: string[];
  voiceOn: boolean;
  onVoice: () => void;
  onHome: () => void;
  locationName: string;
  tenantInitial: string;
}

export default function StatusBar({
  lang,
  setLang,
  locales,
  voiceOn,
  onVoice,
  onHome,
  locationName,
  tenantInitial,
}: StatusBarProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 44px",
        zIndex: 50,
        color: "var(--ink)",
        background: "var(--bone)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Logo + ubicación */}
      <div
        onClick={onHome}
        className="tap"
        style={{ display: "flex", alignItems: "center", gap: 16 }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "var(--ink)",
            display: "grid",
            placeItems: "center",
            color: "var(--accent)",
            fontFamily: "var(--serif)",
            fontSize: 30,
            fontStyle: "italic",
            flexShrink: 0,
          }}
        >
          {tenantInitial}
        </div>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {ui(lang, "concierge")}
          </div>
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ink)",
              marginTop: 3,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="pin" size={13} sw={2} />
            {locationName}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Voz */}
        <button
          onClick={onVoice}
          className="tap"
          style={{
            border: "none",
            borderRadius: 999,
            padding: "12px 22px",
            minHeight: 52,
            gap: 10,
            background: voiceOn ? "var(--accent)" : "var(--bone-2)",
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "var(--sans)",
          }}
        >
          <Icon name="mic" size={20} sw={2} />
          {voiceOn && ui(lang, "listening")}
        </button>

        {/* Selector de idioma (desde tenant.locales) */}
        <div
          style={{
            display: "flex",
            borderRadius: 999,
            padding: 4,
            background: "var(--bone-2)",
          }}
        >
          {locales.map((L) => (
            <button
              key={L}
              onClick={() => setLang(L)}
              className="tap"
              style={{
                border: "none",
                borderRadius: 999,
                padding: "12px 20px",
                minWidth: 60,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.06em",
                background: lang === L ? "var(--ink)" : "transparent",
                color: lang === L ? "var(--bone)" : "var(--ink)",
                cursor: "pointer",
                fontFamily: "var(--sans)",
              }}
            >
              {L.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Accesibilidad */}
        <button
          className="tap"
          style={{
            border: "none",
            borderRadius: 999,
            width: 52,
            height: 52,
            background: "var(--bone-2)",
            color: "var(--ink)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="access" size={24} sw={1.8} />
        </button>
      </div>
    </div>
  );
}
