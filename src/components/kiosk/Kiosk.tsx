"use client";

import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import AttractScreen from "./AttractScreen";
import StatusBar from "./StatusBar";
import HomeScreen from "./HomeScreen";
import BrowseScreen from "./BrowseScreen";
import DetailScreen from "./DetailScreen";
import CartBar from "./CartBar";
import CartScreen from "./CartScreen";
import CheckoutScreen from "./CheckoutScreen";
import ConfirmationScreen from "./ConfirmationScreen";
import { UiTextProvider } from "./uiText";
import { Catalog, CatalogService } from "@/lib/catalog.schema";
import type { CartLineItem, Cart } from "@/lib/payments/cart.schema";
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
  // Carrito: lista de líneas con slug, fecha opcional y pasajeros/cantidad.
  const [cart, setCart] = useState<CartLineItem[]>([]);
  // Navegación dentro del árbol: slug del grupo abierto (null = home).
  const [browseSlug, setBrowseSlug] = useState<string | null>(null);
  // Servicio hoja cuyo detalle se está viendo (null = ninguno).
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const analyticsRef = useRef<string | null>(null);

  const track = useMemo(
    () =>
      (
        tipo: Parameters<typeof trackEvent>[0]["tipo"],
        id: string,
        payload?: Record<string, unknown>
      ) =>
        trackEvent({ tenantSlug: tenant.slug, sessionId: id, tipo, locale: lang, payload }),
    [tenant.slug, lang]
  );

  useEffect(() => {
    if (!analyticsRef.current) {
      analyticsRef.current = nuevoSessionId();
      track("session_start", analyticsRef.current);
    }
    track("screen_view", analyticsRef.current, { screen });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const locationName = locations[0]?.nombre ?? tenant.nombre;
  const tenantInitial = (tenant.branding?.mark ?? tenant.nombre.charAt(0)).toUpperCase();
  const partners = Array.from(new Set(services.map((s) => s.proveedor.nombre)));

  // Mapa rápido de slug -> CatalogService
  const porSlug = useMemo(
    () => new Map(services.map((s) => [s.slug, s])),
    [services]
  );

  // Líneas del carrito con el CatalogService resuelto
  const cartLines = useMemo(
    () =>
      cart
        .map((item) => ({ item, service: porSlug.get(item.service_slug) }))
        .filter((l): l is { item: CartLineItem; service: CatalogService } =>
          l.service !== undefined
        ),
    [cart, porSlug]
  );

  // Total y conteo del carrito (para display local; el servidor recalcula todo)
  const cartCount = useMemo(
    () =>
      cartLines.reduce((acc, { item }) => {
        if (item.pasajeros) return acc + item.pasajeros.reduce((a, p) => a + p.cantidad, 0);
        return acc + (item.cantidad ?? 0);
      }, 0),
    [cartLines]
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce(({ total }, { item, service }) => {
        if (item.pasajeros && service.price_tiers.length > 0) {
          const tierMap = new Map(service.price_tiers.map((t) => [t.tipo, t.precio]));
          const subtotal = item.pasajeros.reduce(
            (a, p) => a + (tierMap.get(p.tipo) ?? service.precio_desde ?? 0) * p.cantidad,
            0
          );
          return { total: total + subtotal };
        }
        return {
          total: total + (service.precio_desde ?? 0) * (item.cantidad ?? 0),
        };
      }, { total: 0 }).total,
    [cartLines]
  );

  const moneda =
    cartLines[0]?.service.moneda ?? services[0]?.moneda ?? "EUR";

  // Payload para el servidor (solo qué + cuánto, sin precios)
  const cartPayload: Cart = useMemo(
    () => ({
      items: cart.map((item) => ({
        service_slug: item.service_slug,
        ...(item.fecha ? { fecha: item.fecha } : {}),
        ...(item.pasajeros ? { pasajeros: item.pasajeros } : {}),
        ...(item.cantidad !== undefined ? { cantidad: item.cantidad } : {}),
      })),
    }),
    [cart]
  );

  const colors = tenant.branding?.colors ?? {};
  const fonts = tenant.branding?.fonts ?? {};
  const brandVars: CSSProperties = {
    ...(colors.ink ? { ["--ink" as string]: colors.ink } : {}),
    ...(colors.bone ? { ["--bone" as string]: colors.bone } : {}),
    ...(colors.accent ? { ["--accent" as string]: colors.accent } : {}),
    ...(fonts.serif ? { ["--font-serif" as string]: `"${fonts.serif}"` } : {}),
    ...(fonts.sans ? { ["--font-inter" as string]: `"${fonts.sans}"` } : {}),
  } as CSSProperties;

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

  useEffect(() => {
    if (!voice) return;
    const t = setTimeout(() => setVoice(false), 3500);
    return () => clearTimeout(t);
  }, [voice]);

  // Selección de un nodo del catálogo
  function handleSelect(service: CatalogService) {
    if (service.tipo_nodo === "grupo") {
      setBrowseSlug(service.slug);
      if (analyticsRef.current)
        track("screen_view", analyticsRef.current, { screen: "browse", node: service.slug });
      return;
    }
    setDetailSlug(service.slug);
    if (analyticsRef.current)
      track("screen_view", analyticsRef.current, { screen: "detail", node: service.slug });
  }

  // Añade o reemplaza una línea del carrito (de DetailScreen)
  function handleAddToCart(newItem: CartLineItem) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.service_slug === newItem.service_slug);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newItem;
        return next;
      }
      return [...prev, newItem];
    });
    if (analyticsRef.current)
      track("add_to_cart", analyticsRef.current, {
        service_slug: newItem.service_slug,
      });
  }

  function removeItem(slug: string) {
    setCart((prev) => prev.filter((i) => i.service_slug !== slug));
  }

  function incItem(slug: string) {
    setCart((prev) =>
      prev.map((i) =>
        i.service_slug === slug && i.cantidad !== undefined
          ? { ...i, cantidad: i.cantidad + 1 }
          : i
      )
    );
  }
  function decItem(slug: string) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.service_slug !== slug || i.cantidad === undefined) return i;
          const next = i.cantidad - 1;
          return next <= 0 ? null : { ...i, cantidad: next };
        })
        .filter(Boolean) as CartLineItem[]
    );
  }

  function handleBrowseBack() {
    if (!browseSlug) return;
    const actual = services.find((s) => s.slug === browseSlug);
    setBrowseSlug(actual?.parent ?? null);
  }

  function resetKiosk() {
    setCart([]);
    setBrowseSlug(null);
    setDetailSlug(null);
    setSessionId(null);
    analyticsRef.current = nuevoSessionId();
    track("session_start", analyticsRef.current);
    setScreen("attract");
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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
                onHome={() => {
                  setBrowseSlug(null);
                  setDetailSlug(null);
                  setScreen("attract");
                }}
                locationName={locationName}
                tenantInitial={tenantInitial}
              />
              {detailSlug ? (
                <DetailScreen
                  catalog={catalog}
                  lang={lang}
                  nodeSlug={detailSlug}
                  cartItem={cart.find((i) => i.service_slug === detailSlug)}
                  onBack={() => setDetailSlug(null)}
                  onAddToCart={handleAddToCart}
                  onRemoveFromCart={removeItem}
                />
              ) : browseSlug ? (
                <BrowseScreen
                  catalog={catalog}
                  lang={lang}
                  nodeSlug={browseSlug}
                  onSelect={handleSelect}
                  onBack={handleBrowseBack}
                />
              ) : (
                <HomeScreen catalog={catalog} lang={lang} onSelect={handleSelect} />
              )}
              <CartBar
                lang={lang}
                count={cartCount}
                total={cartTotal}
                moneda={moneda}
                onOpen={() => {
                  if (analyticsRef.current)
                    track("view_cart", analyticsRef.current, { count: cartCount });
                  setScreen("cart");
                }}
              />
            </>
          )}

          {screen === "cart" && (
            <CartScreen
              lang={lang}
              lines={cartLines}
              moneda={moneda}
              total={cartTotal}
              onInc={incItem}
              onDec={decItem}
              onRemove={removeItem}
              onEdit={(slug) => {
                setDetailSlug(slug);
                setScreen("home");
              }}
              onBack={() => setScreen("home")}
              onPay={() => {
                if (analyticsRef.current)
                  track("checkout_start", analyticsRef.current, { total: cartTotal });
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
                if (analyticsRef.current)
                  track("payment_success", analyticsRef.current, { checkout_session: sid });
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
