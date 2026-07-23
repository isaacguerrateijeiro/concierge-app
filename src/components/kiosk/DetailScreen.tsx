"use client";

import { useState, useMemo, useEffect } from "react";
import { Lang } from "./data";
import { useUiText } from "./uiText";
import { Catalog, CatalogService, PriceTier, tx } from "@/lib/catalog.schema";
import { formatearImporte } from "./format";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";
import type { CartLineItem, Pasajero } from "@/lib/payments/cart.schema";
import { consultarDisponibilidad } from "@/lib/integrations/disponibilidad";
import type { Disponibilidad } from "@/lib/integrations/types";

// Plazas restantes para una fecha: excepción por fecha si existe; si no, la
// capacidad diaria por defecto. null = sin límite (ilimitado).
function plazasRestantes(disp: Disponibilidad | null, fecha: string | null): number | null {
  if (!disp || !fecha) return null;
  const d = disp.dias[fecha];
  if (d) return d.agotado ? 0 : d.restante;
  return disp.capacidadDiaria;
}

interface DetailScreenProps {
  catalog: Catalog;
  lang: Lang;
  nodeSlug: string;
  cartItem?: CartLineItem; // existing cart item (if any)
  onBack: () => void;
  onAddToCart: (item: CartLineItem) => void;
  onRemoveFromCart: (slug: string) => void;
}

function buscarServicio(catalog: Catalog, slug: string): CatalogService | null {
  return catalog.services.find((s) => s.slug === slug) ?? null;
}

function tituloPadre(
  catalog: Catalog,
  service: CatalogService,
  lang: Lang
): string | null {
  if (!service.parent) return null;
  const padre = catalog.services.find((s) => s.slug === service.parent);
  return padre ? tx(padre.titulo_i18n, lang) : null;
}

// ── Calendar ──────────────────────────────────────────────────────────────────

const DIAS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const DIAS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function CalendarioMinicalendario({
  lang,
  fechaSeleccionada,
  disponibilidad,
  onSelect,
}: {
  lang: Lang;
  fechaSeleccionada: string | null;
  disponibilidad: Disponibilidad | null;
  onSelect: (fecha: string) => void;
}) {
  const hoy = new Date();
  const hoyStr = toIso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const [año, setAño] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-indexed

  const diasSemana = lang === "en" ? DIAS_EN : DIAS_ES;
  const meses = lang === "en" ? MESES_EN : MESES_ES;

  // Primer día de la semana de este mes (lunes=0)
  const primerDia = new Date(año, mes, 1);
  const offsetLunes = (primerDia.getDay() + 6) % 7; // 0=lunes
  const diasEnMes = new Date(año, mes + 1, 0).getDate();

  function prevMes() {
    if (mes === 0) { setMes(11); setAño((y) => y - 1); }
    else setMes((m) => m - 1);
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAño((y) => y + 1); }
    else setMes((m) => m + 1);
  }

  const celdas: Array<{ dia: number | null; iso: string | null; pasado: boolean; agotado: boolean }> = [];
  for (let i = 0; i < offsetLunes; i++) celdas.push({ dia: null, iso: null, pasado: true, agotado: false });
  for (let d = 1; d <= diasEnMes; d++) {
    const iso = toIso(año, mes, d);
    const restante = plazasRestantes(disponibilidad, iso);
    const agotado = restante !== null && restante <= 0;
    celdas.push({ dia: d, iso, pasado: iso < hoyStr, agotado });
  }

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      {/* Cabecera: mes/año + flechas */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button
          type="button"
          onClick={prevMes}
          style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 10, width: 50, height: 50, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
        >‹</button>
        <span style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>
          {meses[mes]} {año}
        </span>
        <button
          type="button"
          onClick={nextMes}
          style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 10, width: 50, height: 50, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
        >›</button>
      </div>

      {/* Días de la semana */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
        {diasSemana.map((d) => (
          <div key={d} style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.12em", color: "var(--muted)", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Celdas del mes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {celdas.map((c, i) => {
          if (!c.dia) return <div key={i} />;
          const seleccionado = c.iso === fechaSeleccionada;
          const esHoy = c.iso === hoyStr;
          const bloqueado = c.pasado || c.agotado;
          return (
            <button
              key={i}
              type="button"
              disabled={bloqueado}
              onClick={() => c.iso && !bloqueado && onSelect(c.iso)}
              style={{
                position: "relative",
                height: 54,
                borderRadius: 12,
                border: seleccionado
                  ? "2px solid var(--ink)"
                  : esHoy && !c.agotado
                  ? "2px solid var(--accent, #e67e22)"
                  : "2px solid transparent",
                background: seleccionado ? "var(--ink)" : "transparent",
                color: bloqueado ? "var(--muted)" : seleccionado ? "#fff" : "var(--ink)",
                fontFamily: "var(--sans)",
                fontWeight: seleccionado || esHoy ? 700 : 400,
                fontSize: 18,
                cursor: bloqueado ? "not-allowed" : "pointer",
                opacity: c.pasado ? 0.35 : c.agotado ? 0.55 : 1,
                textDecoration: c.agotado ? "line-through" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {c.dia}
              {c.agotado && !c.pasado && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#c0392b",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Passenger selector ────────────────────────────────────────────────────────

function PasajeroRow({
  tier,
  cantidad,
  lang,
  moneda,
  disableInc,
  onInc,
  onDec,
}: {
  tier: PriceTier;
  cantidad: number;
  lang: Lang;
  moneda: string;
  disableInc?: boolean;
  onInc: () => void;
  onDec: () => void;
}) {
  const t = useUiText();
  const label = tx(tier.label_i18n, lang) || tier.tipo;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "20px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 22, color: "var(--ink)" }}>{label}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--muted)", marginTop: 2 }}>
          {formatearImporte(tier.precio, moneda, lang)} {t(lang, "perPerson")}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <QtyBtn label="−" onClick={onDec} />
        <span style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: 28, minWidth: 30, textAlign: "center", color: "var(--ink)" }}>
          {cantidad}
        </span>
        <QtyBtn label="+" onClick={onInc} disabled={disableInc} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DetailScreen({
  catalog,
  lang,
  nodeSlug,
  cartItem,
  onBack,
  onAddToCart,
  onRemoveFromCart,
}: DetailScreenProps) {
  const t = useUiText();
  const service = buscarServicio(catalog, nodeSlug);

  const hasTiers = (service?.price_tiers?.length ?? 0) > 0;

  // Fecha seleccionada
  const [fecha, setFecha] = useState<string | null>(
    cartItem?.fecha ?? null
  );

  // Cantidades por tipo de pasajero (inicializado desde cartItem si existe)
  const [pasajeros, setPasajeros] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (cartItem?.pasajeros) {
      for (const p of cartItem.pasajeros) init[p.tipo] = p.cantidad;
    }
    return init;
  });

  // Cantidad para servicios sin tiers (comportamiento legado)
  const [justAdded, setJustAdded] = useState(false);

  // Disponibilidad por fecha del proveedor (stock local o API real vía adaptador).
  // null = aún cargando; {} o mapa = ya resuelto. El componente se remonta por
  // servicio (key=slug), así que no hace falta reiniciar el estado manualmente.
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const cargandoDisp = hasTiers && disponibilidad === null;

  useEffect(() => {
    if (!hasTiers) return;
    let activo = true;
    consultarDisponibilidad(nodeSlug)
      .then((m) => {
        if (activo) setDisponibilidad(m);
      })
      .catch(() => {
        if (activo) setDisponibilidad({ capacidadDiaria: null, dias: {} });
      });
    return () => {
      activo = false;
    };
  }, [hasTiers, nodeSlug]);

  // Total dinámico basado en tiers seleccionados (hook antes del early return)
  const totalTiers = useMemo(() => {
    if (!hasTiers || !service) return null;
    return service.price_tiers.reduce((acc, tier) => {
      return acc + tier.precio * (pasajeros[tier.tipo] ?? 0);
    }, 0);
  }, [hasTiers, service, pasajeros]);

  if (!service) {
    return (
      <div style={{ position: "absolute", inset: 0, paddingTop: 120, textAlign: "center", background: "var(--bone)" }}>
        <p style={{ fontFamily: "var(--sans)", fontSize: 20, color: "var(--muted)" }}>{t(lang, "empty")}</p>
      </div>
    );
  }

  const titulo = tx(service.titulo_i18n, lang);
  const tituloCorto = titulo.split("·").slice(-1)[0].trim();
  const subtitulo = tx(service.subtitulo_i18n, lang);
  const descripcion = tx(service.descripcion_i18n, lang);
  const puntoEncuentro = tx(service.punto_encuentro_i18n, lang);
  const instrucciones = tx(service.instrucciones_i18n, lang);
  const duracion = tx(service.duracion_i18n, lang);
  const breadcrumb = tituloPadre(catalog, service, lang);
  const esDerivado = service.tipo_pago === "derivado";
  const tienePrecio = service.precio_desde !== null && service.precio_desde > 0;
  const gratis = service.precio_desde === 0;

  const totalPasajeros = Object.values(pasajeros).reduce((a, b) => a + b, 0);
  // Plazas restantes para la fecha elegida (null = sin límite configurado).
  const plazasFecha = plazasRestantes(disponibilidad, fecha);
  const alcanzadoMax = plazasFecha !== null && totalPasajeros >= plazasFecha;
  const dentroDeStock = plazasFecha === null || totalPasajeros <= plazasFecha;
  const puedeAñadir = hasTiers
    ? fecha !== null && totalPasajeros > 0 && dentroDeStock
    : true;

  // ── Cantidad ya en carrito (para servicios sin tiers) ──
  const cantidadLegado = cartItem?.cantidad ?? 0;

  function handleAddSimple() {
    onAddToCart({ service_slug: service!.slug, cantidad: 1 });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }
  function handleAddWithTiers() {
    if (!puedeAñadir) return;
    const paxArray: Pasajero[] = Object.entries(pasajeros)
      .filter(([, qty]) => qty > 0)
      .map(([tipo, cantidad]) => ({ tipo, cantidad }));
    onAddToCart({
      service_slug: service!.slug,
      fecha: fecha ?? undefined,
      pasajeros: paxArray,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }
  function handleBook() {
    if (service!.url_redireccion) {
      window.open(service!.url_redireccion, "_blank", "noopener,noreferrer");
    }
  }

  const enCarrito = hasTiers
    ? totalPasajeros > 0 && cartItem !== undefined
    : cantidadLegado > 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 96,
        paddingBottom: 80,
        overflowY: "auto",
        background: "var(--bone)",
      }}
    >
      {/* Hero */}
      <div style={{ position: "relative", width: "100%", height: 460, overflow: "hidden", background: service.proveedor.color_marca ?? "var(--ink)" }}>
        {service.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imagen_url}
            alt={tituloCorto}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
            <BrandLogo id={service.proveedor.slug} w={280} h={100} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0) 45%)", pointerEvents: "none" }} />
        <button
          type="button"
          onClick={onBack}
          className="tap"
          style={{ position: "absolute", top: 24, left: 24, display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 999, padding: "12px 22px", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink)", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}
        >
          <Icon name="arrow-left" size={16} sw={2.4} stroke="var(--ink)" />
          {t(lang, "back")}
        </button>
        <div style={{ position: "absolute", left: 24, bottom: 22, padding: "8px 16px", background: "rgba(22,20,15,0.82)", backdropFilter: "blur(4px)", borderRadius: 999, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#fff" }}>
          {service.proveedor.nombre}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "36px 60px 24px" }}>
        {breadcrumb && (
          <div style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
            {breadcrumb}
          </div>
        )}
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 58, lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0, color: "var(--ink)" }}>
          {tituloCorto}
        </h1>

        {duracion && (
          <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 18px", background: "var(--bone-2)", borderRadius: 999, border: "1px solid var(--line)" }}>
              <Icon name="clock" size={18} sw={2} stroke="var(--muted)" />
              <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink)" }}>{duracion}</span>
            </div>
          </div>
        )}

        {subtitulo && (
          <p style={{ fontFamily: "var(--sans)", fontSize: 22, lineHeight: 1.5, color: "var(--ink-3)", marginTop: duracion ? 14 : 18, maxWidth: 880 }}>
            {subtitulo}
          </p>
        )}

        {/* Precio base (solo si no hay tiers o es derivado) */}
        {!hasTiers && (
          <div style={{ marginTop: 28, display: "flex", alignItems: "baseline", gap: 14 }}>
            {tienePrecio ? (
              <>
                <span style={{ fontFamily: "var(--mono)", fontSize: 15, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>{t(lang, "from")}</span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 56, lineHeight: 1, color: "var(--ink)" }}>
                  {formatearImporte(service.precio_desde!, service.moneda, lang)}
                </span>
              </>
            ) : gratis ? (
              <span style={{ fontFamily: "var(--serif)", fontSize: 48, lineHeight: 1, color: "var(--ink)" }}>{t(lang, "free")}</span>
            ) : null}
          </div>
        )}

        {/* Precio desde (tiers): mostrar "desde X" */}
        {hasTiers && tienePrecio && (
          <div style={{ marginTop: 28, display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 15, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>{t(lang, "from")}</span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 56, lineHeight: 1, color: "var(--ink)" }}>
              {formatearImporte(service.precio_desde!, service.moneda, lang)}
            </span>
          </div>
        )}
      </div>

      {/* Descripción larga + cómo usar el billete + punto de encuentro */}
      {(descripcion || instrucciones || puntoEncuentro) && (
        <div style={{ padding: "4px 60px 8px", maxWidth: 940 }}>
          {descripcion && (
            <>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                {t(lang, "about")}
              </div>
              <div style={{ fontFamily: "var(--sans)", fontSize: 19, lineHeight: 1.6, color: "var(--ink-3)", margin: 0, whiteSpace: "pre-line" }}>
                {descripcion}
              </div>
            </>
          )}
          {instrucciones && (
            <div
              style={{
                marginTop: descripcion ? 22 : 0,
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                background: "#fff",
                border: "2px solid var(--ink)",
                borderRadius: 18,
                padding: "18px 22px",
              }}
            >
              <Icon name="card" size={26} sw={2} stroke="var(--ink)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {t(lang, "howToUse")}
                </div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 18, lineHeight: 1.5, color: "var(--ink)", marginTop: 6, whiteSpace: "pre-line" }}>
                  {instrucciones}
                </div>
              </div>
            </div>
          )}
          {puntoEncuentro && (
            <div style={{ marginTop: descripcion || instrucciones ? 22 : 0, display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 20px" }}>
              <Icon name="pin" size={22} sw={2} stroke="var(--accent, #e67e22)" />
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {t(lang, "meetingPoint")}
                </div>
                <div style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 20, color: "var(--ink)", marginTop: 2 }}>
                  {puntoEncuentro}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sección de tiers: calendario + pasajeros ── */}
      {hasTiers && !esDerivado && (
        <div style={{ padding: "0 60px 28px" }}>
          {/* Calendario */}
          <div style={{ background: "#fff", borderRadius: 22, padding: "28px 28px 20px", border: "1px solid var(--line)", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>
                {t(lang, "chooseDate")}
              </div>
              {cargandoDisp && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
                  {t(lang, "checkingAvailability")}
                </span>
              )}
            </div>
            <CalendarioMinicalendario
              lang={lang}
              fechaSeleccionada={fecha}
              disponibilidad={disponibilidad}
              onSelect={setFecha}
            />
            {fecha && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, color: "var(--accent, #e67e22)" }}>
                <Icon name="check" size={16} sw={2.4} stroke="var(--accent, #e67e22)" />
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.12em" }}>
                  {fecha}
                </span>
              </div>
            )}
          </div>

          {/* Selectores de pasajeros */}
          <div style={{ background: "#fff", borderRadius: 22, padding: "20px 28px 8px", border: "1px solid var(--line)", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>
                {t(lang, "passengers")}
              </div>
              {fecha && plazasFecha !== null && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: alcanzadoMax ? "#c0392b" : "var(--muted)" }}>
                  {plazasFecha} {t(lang, "seatsLeft")}
                </span>
              )}
            </div>
            {service.price_tiers.map((tier) => (
              <PasajeroRow
                key={tier.tipo}
                tier={tier}
                cantidad={pasajeros[tier.tipo] ?? 0}
                lang={lang}
                moneda={service.moneda}
                disableInc={alcanzadoMax}
                onInc={() =>
                  setPasajeros((p) => {
                    if (alcanzadoMax) return p;
                    return { ...p, [tier.tipo]: (p[tier.tipo] ?? 0) + 1 };
                  })
                }
                onDec={() =>
                  setPasajeros((p) => ({
                    ...p,
                    [tier.tipo]: Math.max(0, (p[tier.tipo] ?? 0) - 1),
                  }))
                }
              />
            ))}
            {alcanzadoMax && (
              <div style={{ fontFamily: "var(--sans)", fontSize: 15, color: "#c0392b", padding: "10px 0 0" }}>
                {t(lang, "maxSeats")}
              </div>
            )}

            {/* Total dinámico */}
            {totalTiers !== null && totalTiers > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0 12px", borderTop: "1px solid var(--line)", marginTop: 8 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {t(lang, "subtotal")}
                </span>
                <span style={{ fontFamily: "var(--serif)", fontSize: 38, lineHeight: 1, color: "var(--ink)" }}>
                  {formatearImporte(totalTiers, service.moneda, lang)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: "0 60px 48px" }}>
        {esDerivado ? (
          <button
            type="button"
            onClick={handleBook}
            disabled={!service.url_redireccion}
            className="tap"
            style={{
              width: "100%",
              background: service.url_redireccion ? "var(--ink)" : "var(--muted)",
              color: "#fff",
              border: "none",
              borderRadius: 22,
              padding: "30px",
              fontFamily: "var(--sans)",
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              cursor: service.url_redireccion ? "pointer" : "not-allowed",
            }}
          >
            <Icon name="globe" size={28} sw={2.2} stroke="#fff" />
            {t(lang, "book")}
          </button>
        ) : hasTiers ? (
          /* Servicio con tiers integrado */
          <button
            type="button"
            onClick={handleAddWithTiers}
            disabled={!puedeAñadir}
            className="tap"
            style={{
              width: "100%",
              background: justAdded ? "var(--accent, #27ae60)" : !puedeAñadir ? "var(--muted)" : "var(--ink)",
              color: "#fff",
              border: "none",
              borderRadius: 22,
              padding: "30px",
              fontFamily: "var(--sans)",
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              cursor: puedeAñadir ? "pointer" : "not-allowed",
              transition: "background 0.2s ease",
            }}
          >
            <Icon
              name={justAdded ? "check" : "cart"}
              size={28}
              sw={2.2}
              stroke="#fff"
            />
            {justAdded
              ? t(lang, "added")
              : !fecha
              ? t(lang, "dateRequired")
              : totalPasajeros === 0
              ? t(lang, "passengersRequired")
              : enCarrito
              ? t(lang, "added")
              : t(lang, "addToCart")}
          </button>
        ) : enCarrito ? (
          /* Servicio simple ya en carrito */
          <div style={{ display: "flex", alignItems: "center", gap: 22, background: "#fff", border: "1px solid var(--line)", borderRadius: 22, padding: "22px 30px" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, color: "var(--ink)" }}>
              <Icon name="check" size={26} sw={2.4} stroke="var(--accent)" />
              <span style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 22 }}>{t(lang, "added")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <QtyBtn label="−" onClick={() => onRemoveFromCart(service.slug)} />
              <span style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: 28, minWidth: 30, textAlign: "center", color: "var(--ink)" }}>
                {cantidadLegado}
              </span>
              <QtyBtn label="+" onClick={handleAddSimple} />
            </div>
          </div>
        ) : (
          /* Servicio simple no en carrito */
          <button
            type="button"
            onClick={handleAddSimple}
            className="tap"
            style={{
              width: "100%",
              background: justAdded ? "var(--accent)" : "var(--ink)",
              color: "#fff",
              border: "none",
              borderRadius: 22,
              padding: "30px",
              fontFamily: "var(--sans)",
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
          >
            <Icon name={justAdded ? "check" : "cart"} size={28} sw={2.2} stroke="#fff" />
            {justAdded ? t(lang, "added") : t(lang, "addToCart")}
          </button>
        )}
      </div>
    </div>
  );
}

function QtyBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="tap"
      style={{
        width: 54,
        height: 54,
        borderRadius: "50%",
        border: "2px solid var(--ink)",
        background: "transparent",
        color: "var(--ink)",
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}
