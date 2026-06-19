"use client";

import { useState, useEffect } from "react";
import { Lang, LOCATIONS, T } from "./data";
import Icon from "./Icon";

// Las 3 escenas que rotan cada 4.5 segundos
const SCENES = [
  {
    bg: "radial-gradient(at 70% 20%, #E89C5C 0%, transparent 50%), linear-gradient(180deg, #F4D88A 0%, #C04A2A 55%, #2A1810 100%)",
    tag: { es: "Madrid", en: "Madrid" },
  },
  {
    bg: "radial-gradient(at 50% 30%, rgba(242,194,0,0.4) 0%, transparent 55%), linear-gradient(180deg, #0E2A4A 0%, #16140F 100%)",
    tag: { es: "Vívelo", en: "Live it" },
  },
  {
    bg: "radial-gradient(at 30% 70%, rgba(242,194,0,0.3) 0%, transparent 50%), linear-gradient(180deg, #1B2438 0%, #0A0E1A 100%)",
    tag: { es: "A tu aire", en: "Your way" },
  },
];

const PARTNERS = ["Bolt", "Big Bus", "ChangeGroup", "Julia Travel", "Madrid a Pie", "RACE", "Prosegur"];

interface AttractScreenProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  onStart: () => void;
}

export default function AttractScreen({ lang, setLang, onStart }: AttractScreenProps) {
  const t = T[lang];
  const location = LOCATIONS[0];
  // idx controla qué escena se muestra (0, 1 o 2)
  const [idx, setIdx] = useState(0);

  // Avanza la escena automáticamente cada 4.5 segundos
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % SCENES.length), 4500);
    return () => clearInterval(id);
  }, []);

  const scene = SCENES[idx];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: scene.bg,
        transition: "background 1s ease",
      }}
    >
      {/* Viñeta oscura para mejorar legibilidad del texto */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* ── Barra superior ── */}
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
          color: "#fff",
        }}
      >
        {/* Logo M + ubicación */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "rgba(255,255,255,0.18)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--serif)",
              fontSize: 30,
              fontStyle: "italic",
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                opacity: 0.65,
              }}
            >
              {lang === "es" ? "Concierge digital" : "Digital concierge"}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="pin" size={13} sw={2} stroke="#fff" />
              Madrid · {location.name}
            </div>
          </div>
        </div>

        {/* Selector de idioma ES / EN */}
        <div
          style={{
            display: "flex",
            borderRadius: 999,
            padding: 4,
            background: "rgba(255,255,255,0.15)",
          }}
        >
          {(["es", "en"] as Lang[]).map((L) => (
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
                fontFamily: "var(--sans)",
                background: lang === L ? "#fff" : "transparent",
                color: lang === L ? "var(--ink)" : "#fff",
                cursor: "pointer",
              }}
            >
              {L.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido central ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          textAlign: "center",
          padding: "120px 60px",
        }}
      >
        {/* Pastilla de ubicación */}
        <div
          className="fade-in"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 14,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            padding: "12px 28px",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: 999,
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Icon name="pin" size={14} sw={2} stroke="#fff" />
          Madrid · {location.name}
        </div>

        {/* "Concierge digital" */}
        <div
          className="fade-in"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 36,
            animationDelay: "0.1s",
          }}
        >
          {lang === "es" ? "Concierge digital" : "Digital concierge"}
        </div>

        {/* "Hola" — siempre fijo */}
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 200,
            lineHeight: 1,
            letterSpacing: "-0.025em",
            whiteSpace: "nowrap",
          }}
        >
          Hola
        </div>

        {/* Subtítulo rotante — cambia con cada escena */}
        <div
          key={idx}
          className="fade-in"
          style={{
            fontFamily: "var(--serif)",
            fontSize: 96,
            lineHeight: 1.1,
            marginTop: 36,
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
            minHeight: 110,
          }}
        >
          {scene.tag[lang]}
        </div>

        {/* Descripción */}
        <div
          className="fade-in"
          style={{
            fontFamily: "var(--sans)",
            fontSize: 28,
            marginTop: 56,
            opacity: 0.92,
            maxWidth: 760,
            lineHeight: 1.4,
            fontWeight: 400,
            whiteSpace: "pre-line",
            animationDelay: "0.2s",
          }}
        >
          {lang === "es"
            ? "Tours, taxis, museos, divisa…\nUn único asistente para tu visita."
            : "Tours, taxis, museums, currency…\nOne assistant for your whole visit."}
        </div>

        {/* Pastillas de socios */}
        <div
          className="fade-in"
          style={{
            marginTop: 40,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 880,
            opacity: 0.82,
            animationDelay: "0.3s",
          }}
        >
          {PARTNERS.map((p) => (
            <div
              key={p}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.28)",
                borderRadius: 999,
              }}
            >
              {p}
            </div>
          ))}
        </div>

        {/* Botón CTA */}
        <button
          onClick={onStart}
          className="tap"
          style={{
            marginTop: 100,
            background: "var(--accent)",
            color: "var(--ink)",
            border: "none",
            borderRadius: 999,
            padding: "40px 80px",
            fontWeight: 800,
            fontSize: 36,
            letterSpacing: "-0.01em",
            fontFamily: "var(--sans)",
            display: "flex",
            alignItems: "center",
            gap: 24,
            cursor: "pointer",
            minHeight: 120,
            animation: "pulseRing 2.4s ease-out infinite, bounce 2.4s ease-in-out infinite",
          }}
        >
          {t.tap}
          <Icon name="arrow-right" size={36} sw={2.4} stroke="var(--ink)" />
        </button>
      </div>

      {/* ── Puntos de paginación (abajo) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {SCENES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === idx ? 48 : 12,
              height: 8,
              borderRadius: 4,
              background: i === idx ? "var(--accent)" : "rgba(255,255,255,0.4)",
              transition: "all 0.4s ease",
            }}
          />
        ))}
      </div>

      {/* "Powered by PROSEGUR" */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        powered by{" "}
        <span style={{ fontWeight: 800, letterSpacing: "0.4em", marginLeft: 8, color: "#fff" }}>
          PROSEGUR
        </span>
      </div>
    </div>
  );
}
