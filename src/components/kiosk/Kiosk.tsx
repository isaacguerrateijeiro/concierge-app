"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
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
import { trackEvent } from "@/lib/kiosk/track";

const KIOSK_W = 1080;
const KIOSK_H = 1920;

function nuevoSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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
  // Sesión de analítica (distinta del checkout de Stripe). Vive en un ref para
  // no provocar renders ni setState dentro de efectos; solo alimenta el tracker.
  const analyticsRef = useRef<string | null>(null);

  // Helper de instrumentación: emite un evento atado a la sesión actual.
  const track = useMemo(() => {
    return (tipo: Parameters<typeof trackEvent>[0]["tipo"], id: string, payload?: Record<string, unknown>) =>
      trackEvent({ tenantSlug: tenant.slug, sessionId: id, tipo, locale: lang, payload });
  }, [tenant.slug, lang]);

  // Inicia la sesión al montar y registra cada cambio de pantalla.
  useEffect(() => {
    if (!analyticsRef.current) {
      analyticsRef.current = nuevoSessionId();
      track("session_start", analyticsRef.current);
    }
    track("screen_view", analyticsRef.current, { screen });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

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

  // Colores y fuentes de marca desde la base de datos -> variables CSS.
  // Las fuentes solo se aplican si están cargadas o son del sistema; en otro
  // caso el navegador usa el respaldo definido en globals.css.
  const colors = tenant.branding?.colors ?? {};
  const fonts = tenant.branding?.fonts ?? {};
  const brandVars: CSSProperties = {
    ...(colors.ink ? { ["--ink" as string]: colors.ink } : {}),
    ...(colors.bone ? { ["--bone" as string]: colors.bone } : {}),
    ...(colors.accent ? { ["--accent" as string]: colors.accent } : {}),
    ...(fonts.serif ? { ["--font-serif" as string]: `"${fonts.serif}"` } : {}),
    ...(fonts.sans ? { ["--font-inter" as string]: `"${fonts.sans}"` } : {}),
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
    if (analyticsRef.current) track("add_to_cart", analyticsRef.current, { service_slug: service.slug });
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
    // Nueva sesión de analítica para el siguiente visitante.
    analyticsRef.current = nuevoSessionId();
    track("session_start", analyticsRef.current);
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
                onOpen={() => {
                  if (analyticsRef.current) track("view_cart", analyticsRef.current, { count: cartCount });
                  setScreen("cart");
                }}
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
              onPay={() => {
                if (analyticsRef.current) track("checkout_start", analyticsRef.current, { total: cartTotal });
                setScreen("checkout");
              }}
            />
          )}

          {screen === "checkout" && (
            <CheckoutScreen
              lang={lang}
              cart={cartPayload}
              onCancel={() => setScreen("cart")}
              onCompleted={(sid) => {
                setSessionId(sid);
                if (analyticsRef.current) track("payment_success", analyticsRef.current, { checkout_session: sid });
                setScreen("confirm");
              }}
            />
          )}

          {screen === "confirm" && sessionId && (
            <ConfirmationScreen
              lang={lang}
              sessionId={sessionId}
              entrega={tenant.entrega}
              onReset={resetKiosk}
            />
          )}
        </UiTextProvider>
      </div>
    </div>
  );
}
