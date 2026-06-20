"use client";

import { useState, useEffect, type CSSProperties } from "react";
import AttractScreen from "./AttractScreen";
import StatusBar from "./StatusBar";
import HomeScreen from "./HomeScreen";
import { UiTextProvider } from "./uiText";
import { Catalog } from "@/lib/catalog.schema";

const KIOSK_W = 1080;
const KIOSK_H = 1920;

type Screen = "attract" | "home";

export default function Kiosk({ catalog }: { catalog: Catalog }) {
  const { tenant, locations, services } = catalog;

  const [lang, setLang] = useState<string>(tenant.locale_default);
  const [voice, setVoice] = useState(false);
  const [screen, setScreen] = useState<Screen>("attract");
  const [scale, setScale] = useState(1);

  // Datos derivados del catálogo para las pantallas
  const locationName = locations[0]?.nombre ?? tenant.nombre;
  const tenantInitial = (tenant.branding?.mark ?? tenant.nombre.charAt(0)).toUpperCase();
  const partners = Array.from(new Set(services.map((s) => s.proveedor.nombre)));

  // Colores de marca desde la base de datos -> variables CSS
  const colors = tenant.branding?.colors ?? {};
  const brandVars: CSSProperties = {
    ...(colors.ink ? { ["--ink" as string]: colors.ink } : {}),
    ...(colors.bone ? { ["--bone" as string]: colors.bone } : {}),
    ...(colors.accent ? { ["--accent" as string]: colors.accent } : {}),
  } as CSSProperties;

  // Escala el kiosko 1080×1920 para encajar en la ventana
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
      <div
        style={{
          ...brandVars,
          width: KIOSK_W,
          height: KIOSK_H,
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        <UiTextProvider texts={tenant.ui}>
        {screen === "attract" ? (
          <AttractScreen
            lang={lang}
            setLang={setLang}
            locales={tenant.locales}
            locationName={locationName}
            partners={partners}
            onStart={() => setScreen("home")}
          />
        ) : (
          <>
            <StatusBar
              lang={lang}
              setLang={setLang}
              locales={tenant.locales}
              voiceOn={voice}
              onVoice={() => setVoice((v) => !v)}
              onHome={() => setScreen("attract")}
              locationName={locationName}
              tenantInitial={tenantInitial}
            />
            <HomeScreen
              catalog={catalog}
              lang={lang}
              onSelect={(slug) => console.log("servicio seleccionado:", slug)}
            />
          </>
        )}
        </UiTextProvider>
      </div>
    </div>
  );
}
