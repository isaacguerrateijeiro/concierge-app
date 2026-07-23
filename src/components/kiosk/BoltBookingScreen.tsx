"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Lang } from "./data";
import { useUiText } from "./uiText";
import { CatalogService, CatalogLocation, tx } from "@/lib/catalog.schema";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";

type TimingMode = "now" | "scheduled";

interface BoltBookingScreenProps {
  lang: Lang;
  service: CatalogService;
  location: CatalogLocation | null;
  onBack: () => void;
}

export default function BoltBookingScreen({
  lang,
  service,
  location,
  onBack,
}: BoltBookingScreenProps) {
  const t = useUiText();
  const pickup = location?.direccion_recogida?.trim() || "";
  const hasPickup = pickup.length > 0;

  const [phone, setPhone] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [timing, setTiming] = useState<TimingMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [triedContinue, setTriedContinue] = useState(false);

  const titulo = tx(service.titulo_i18n, lang);
  const minSchedule = useMemo(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  const phoneOk = phone.replace(/\D/g, "").length >= 8;
  const dropoffOk = dropoff.trim().length >= 3;
  const scheduleOk = timing === "now" || scheduledAt.length > 0;
  const formOk = hasPickup && phoneOk && dropoffOk && scheduleOk;

  function handleContinue() {
    setTriedContinue(true);
    // Sin API Ride Booker aún: no enviamos reserva real.
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        paddingTop: 96,
        paddingBottom: 40,
        overflowY: "auto",
        background: "var(--bone)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 280,
          overflow: "hidden",
          background: service.proveedor.color_marca ?? "#34D186",
        }}
      >
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
          <BrandLogo id={service.proveedor.slug} w={260} h={96} />
        </div>
        <button
          type="button"
          onClick={onBack}
          className="tap"
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.92)",
            border: "none",
            borderRadius: 999,
            padding: "12px 22px",
            fontFamily: "var(--mono)",
            fontSize: 13,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink)",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}
        >
          <Icon name="arrow-left" size={16} sw={2.4} stroke="var(--ink)" />
          {t(lang, "back")}
        </button>
      </div>

      <div style={{ padding: "36px 48px 24px" }}>
        <h1
          style={{
            margin: "0 0 8px",
            fontFamily: "var(--serif)",
            fontSize: 44,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.15,
          }}
        >
          {titulo}
        </h1>
        <p style={{ margin: "0 0 32px", fontFamily: "var(--sans)", fontSize: 20, color: "var(--muted)", lineHeight: 1.4 }}>
          {t(lang, "boltSubtitle")}
        </p>

        {!hasPickup && (
          <div
            style={{
              marginBottom: 28,
              padding: "18px 22px",
              borderRadius: 16,
              background: "rgba(180, 60, 40, 0.08)",
              border: "1px solid rgba(180, 60, 40, 0.25)",
              fontFamily: "var(--sans)",
              fontSize: 18,
              color: "var(--ink)",
              lineHeight: 1.4,
            }}
          >
            {t(lang, "boltMissingPickup")}
          </div>
        )}

        <Field label={t(lang, "boltPhone")}>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t(lang, "phonePlaceholder")}
            style={inputStyle}
          />
          {triedContinue && !phoneOk && <Hint>{t(lang, "boltPhoneRequired")}</Hint>}
        </Field>

        <div style={{ display: "grid", gap: 0, marginBottom: 28 }}>
          <RouteRow
            color="#34D186"
            label={`${t(lang, "boltPickup")} · ${t(lang, "boltPickupLocked")}`}
          >
            <div
              style={{
                ...inputStyle,
                background: "rgba(22,20,15,0.06)",
                color: hasPickup ? "var(--ink)" : "var(--muted)",
                display: "flex",
                alignItems: "center",
                minHeight: 64,
              }}
            >
              {hasPickup ? pickup : t(lang, "boltPickupEmpty")}
            </div>
          </RouteRow>
          <div style={{ width: 2, height: 18, background: "var(--line)", marginLeft: 15 }} />
          <RouteRow color="#6B4EFF" label={t(lang, "boltDropoff")} pin="square">
            <input
              type="text"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
              placeholder={t(lang, "boltDropoffPlaceholder")}
              style={inputStyle}
              autoComplete="street-address"
            />
            {triedContinue && !dropoffOk && <Hint>{t(lang, "boltDropoffRequired")}</Hint>}
          </RouteRow>
        </div>

        <Field label={t(lang, "boltWhen")}>
          <div style={{ display: "grid", gap: 12 }}>
            <Radio
              checked={timing === "now"}
              onSelect={() => setTiming("now")}
              title={t(lang, "boltRequestNow")}
              subtitle={t(lang, "boltRequestNowSub")}
            />
            <Radio
              checked={timing === "scheduled"}
              onSelect={() => setTiming("scheduled")}
              title={t(lang, "boltScheduled")}
              subtitle={t(lang, "boltScheduledSub")}
            />
          </div>
          {timing === "scheduled" && (
            <input
              type="datetime-local"
              min={minSchedule}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{ ...inputStyle, marginTop: 14 }}
            />
          )}
        </Field>

        <Field label={`${t(lang, "boltExpenseNote")} · ${t(lang, "boltOptional")}`}>
          <input
            type="text"
            value={expenseNote}
            onChange={(e) => setExpenseNote(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label={`${t(lang, "boltDriverNote")} · ${t(lang, "boltOptional")}`}>
          <textarea
            value={driverNote}
            onChange={(e) => setDriverNote(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", minHeight: 100, paddingTop: 16 }}
          />
        </Field>

        <div
          style={{
            marginTop: 8,
            marginBottom: 20,
            padding: "16px 20px",
            borderRadius: 14,
            background: "rgba(22,20,15,0.05)",
            fontFamily: "var(--sans)",
            fontSize: 17,
            color: "var(--muted)",
            lineHeight: 1.45,
          }}
        >
          {t(lang, "boltApiPending")}
        </div>

        <button
          type="button"
          className="tap"
          onClick={handleContinue}
          disabled={!hasPickup}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 999,
            padding: "22px 28px",
            fontFamily: "var(--sans)",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            background: hasPickup ? (service.proveedor.color_marca ?? "#34D186") : "var(--muted)",
            cursor: hasPickup ? "pointer" : "not-allowed",
            opacity: formOk || !triedContinue ? 1 : 0.85,
          }}
        >
          {t(lang, "boltContinue")}
        </button>
        {triedContinue && formOk && (
          <p
            style={{
              marginTop: 16,
              textAlign: "center",
              fontFamily: "var(--sans)",
              fontSize: 17,
              color: "var(--muted)",
              lineHeight: 1.4,
            }}
          >
            {t(lang, "boltApiPending")}
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: "0 20px",
  height: 64,
  fontFamily: "var(--sans)",
  fontSize: 20,
  color: "var(--ink)",
  background: "#fff",
  outline: "none",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          marginBottom: 10,
          fontFamily: "var(--mono)",
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 8, fontFamily: "var(--sans)", fontSize: 15, color: "#a33" }}>
      {children}
    </div>
  );
}

function RouteRow({
  color,
  label,
  pin = "circle",
  children,
}: {
  color: string;
  label: string;
  pin?: "circle" | "square";
  children: ReactNode;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: pin === "circle" ? 999 : 4,
            background: color,
            display: "block",
          }}
        />
      </div>
      <div>
        <div
          style={{
            marginBottom: 8,
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function Radio({
  checked,
  onSelect,
  title,
  subtitle,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        textAlign: "left",
        width: "100%",
        padding: "18px 20px",
        borderRadius: 16,
        border: checked ? "2px solid var(--ink)" : "1px solid var(--line)",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          border: checked ? "8px solid var(--ink)" : "2px solid var(--line)",
          boxSizing: "border-box",
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <span>
        <span style={{ display: "block", fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>
          {title}
        </span>
        <span style={{ display: "block", marginTop: 4, fontFamily: "var(--sans)", fontSize: 16, color: "var(--muted)", lineHeight: 1.35 }}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}
