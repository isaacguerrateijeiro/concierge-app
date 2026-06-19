"use client";

import { useState, useEffect } from "react";
import AttractScreen from "@/components/kiosk/AttractScreen";
import StatusBar from "@/components/kiosk/StatusBar";
import HomeScreen from "@/components/kiosk/HomeScreen";
import { Lang, LOCATIONS } from "@/components/kiosk/data";

const KIOSK_W = 1080;
const KIOSK_H = 1920;

// Las pantallas posibles del kiosk
type Screen = "attract" | "home";

export default function Page() {
  const [lang, setLang] = useState<Lang>("es");
  const [voice, setVoice] = useState(false);
  const [screen, setScreen] = useState<Screen>("attract");
  const [scale, setScale] = useState(1);

  const location = LOCATIONS[0];

  // Calcula la escala para que el kiosk 1080×1920 encaje en la ventana
  useEffect(() => {
    function compute() {
      const scaleH = window.innerHeight / KIOSK_H;
      const scaleW = window.innerWidth / KIOSK_W;
      setScale(Math.min(scaleH, scaleW));
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // La voz se apaga sola a los 3.5 segundos
  useEffect(() => {
    if (!voice) return;
    const t = setTimeout(() => setVoice(false), 3500);
    return () => clearTimeout(t);
  }, [voice]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Contenedor del kiosk — siempre 1080×1920, escalado para caber en pantalla */}
      <div
        style={{
          width: KIOSK_W,
          height: KIOSK_H,
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {screen === "attract" ? (
          // AttractScreen tiene su propio StatusBar simplificado
          <AttractScreen
            lang={lang}
            setLang={setLang}
            onStart={() => setScreen("home")}
          />
        ) : (
          // HomeScreen usa el StatusBar completo encima
          <>
            <StatusBar
              lang={lang}
              setLang={setLang}
              voiceOn={voice}
              onVoice={() => setVoice((v) => !v)}
              onHome={() => setScreen("attract")}
              location={location}
            />
            <HomeScreen
              lang={lang}
              onSelect={(id) => console.log("servicio seleccionado:", id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
