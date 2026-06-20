"use client";

import { useState, useEffect, useMemo, type CSSProperties } from "react";
import AttractScreen from "./AttractScreen";
import StatusBar from "./StatusBar";
import HomeScreen from "./HomeScreen";
import CartBar from "./CartBar";
import CartScreen from "./CartScreen";
import CheckoutScreen from "./CheckoutScreen";
import ConfirmationScreen from "./ConfirmationScreen";
import { UiTextProvider } from "./uiText";
import { Catalog, CatalogService } from "@/lib/catalog.schema";
import type { Cart } from "@/lib/payments/cart.schema";

const KIOSK_W = 1080;
const KIOSK_H = 1920;

type Screen = "attract" | "home" | "cart" | "checkout" | "confirm";

export default function Kiosk({ catalog }: { catalog: Catalog }) {
  const { tenant, locations, services } = catalog;

  const [lang, setLang] = useState<string>(tenant.locale_default);
  const [voice, setVoice] = useState(false);
  const [screen, setScreen] = useState<Screen>("attract");
  const [scale, setScale] = useState(1);
  // Carrito: slug del servicio -> cantidad.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Datos derivados del catálogo para las pantallas
  const locationName = locations[0]?.nombre ?? tenant.nombre;
  const tenantInitial = (tenant.branding?.mark ?? tenant.nombre.charAt(0)).toUpperCase();
  const partners = Array.from(new Set(services.map((s) => s.proveedor.nombre)));

  // Líneas del carrito derivadas del catálogo (preservan el orden del catálogo)
  const lines = useMemo(
    () =>
      services
        .filter((s) => (cart[s.slug] ?? 0) > 0)
        .map((s) => ({ service: s, cantidad: cart[s.slug] })),
    [services, cart]
  );
  const cartCount = lines.reduce((acc, l) => acc + l.cantidad, 0);
  const cartTotal = lines.reduce(
    (acc, l) => acc + (l.service.precio_desde ?? 0) * l.cantidad,
    0
  );
  const moneda = lines[0]?.service.moneda ?? services[0]?.moneda ?? "EUR";
  const cartPayload: Cart = {
    items: lines.map((l) => ({ service_slug: l.service.slug, cantidad: l.cantidad })),
  };

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

  // Selección de un servicio: integrado -> carrito; derivado -> redirección.
  function handleSelect(service: CatalogService) {
    if (service.tipo_pago === "derivado") {
      if (service.url_redireccion) {
        window.open(service.url_redireccion, "_blank", "noopener,noreferrer");
      }
      return;
    }
    setCart((prev) => ({ ...prev, [service.slug]: (prev[service.slug] ?? 0) + 1 }));
  }

  function incItem(slug: string) {
    setCart((prev) => ({ ...prev, [slug]: (prev[slug] ?? 0) + 1 }));
  }
  function decItem(slug: string) {
    setCart((prev) => {
      const next = { ...prev };
      const q = (next[slug] ?? 0) - 1;
      if (q <= 0) delete next[slug];
      else next[slug] = q;
      return next;
    });
  }
  function removeItem(slug: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }
  function resetKiosk() {
    setCart({});
    setSessionId(null);
    setScreen("attract");
  }

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
          {screen === "attract" && (
            <AttractScreen
              lang={lang}
              setLang={setLang}
              locales={tenant.locales}
              locationName={locationName}
              partners={partners}
              onStart={() => setScreen("home")}
            />
          )}

          {screen === "home" && (
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
              <HomeScreen catalog={catalog} lang={lang} onSelect={handleSelect} />
              <CartBar
                lang={lang}
                count={cartCount}
                total={cartTotal}
                moneda={moneda}
                onOpen={() => setScreen("cart")}
              />
            </>
          )}

          {screen === "cart" && (
            <CartScreen
              lang={lang}
              lines={lines}
              moneda={moneda}
              total={cartTotal}
              onInc={incItem}
              onDec={decItem}
              onRemove={removeItem}
              onBack={() => setScreen("home")}
              onPay={() => setScreen("checkout")}
            />
          )}

          {screen === "checkout" && (
            <CheckoutScreen
              lang={lang}
              cart={cartPayload}
              onCancel={() => setScreen("cart")}
              onCompleted={(sid) => {
                setSessionId(sid);
                setScreen("confirm");
              }}
            />
          )}

          {screen === "confirm" && sessionId && (
            <ConfirmationScreen lang={lang} sessionId={sessionId} onReset={resetKiosk} />
          )}
        </UiTextProvider>
      </div>
    </div>
  );
}
