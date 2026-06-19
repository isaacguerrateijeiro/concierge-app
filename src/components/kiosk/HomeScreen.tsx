"use client";

import { SERVICES, CATEGORIES, T, Lang, Service } from "./data";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";

interface HomeScreenProps {
  lang: Lang;
  onSelect?: (id: string) => void;
}

function CategoryHeader({
  label,
  sub,
  index,
  total,
  accent = false,
}: {
  label: string;
  sub: string;
  index: number;
  total: number;
  accent?: boolean;
}) {
  return (
    <div
      className="fade-up"
      style={{
        padding: "32px 60px 12px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              width: 32,
              height: 2,
              background: accent ? "var(--accent)" : "var(--ink)",
              display: "inline-block",
              borderRadius: 2,
            }}
          />
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")} · {label}
        </div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: 62,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontSize: 18,
            color: "var(--ink-3)",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function ServiceTile({
  service,
  lang,
  onClick,
  delay = 0,
  big = false,
}: {
  service: Service;
  lang: Lang;
  onClick?: () => void;
  delay?: number;
  big?: boolean;
}) {
  const t = T[lang];
  const free = service.priceFrom === 0;

  return (
    <div
      onClick={onClick}
      className="tap fade-up"
      style={{
        background: "#fff",
        borderRadius: big ? 28 : 22,
        border: "1px solid var(--line)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: big ? 370 : 230,
        animationDelay: `${delay}s`,
        boxShadow: "0 4px 20px rgba(22,20,15,0.05)",
        cursor: "pointer",
      }}
    >
      {/* Brand color block */}
      <div
        style={{
          background: service.color,
          padding: big ? "30px 24px 24px" : "20px 16px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: big ? 190 : 118,
          flexShrink: 0,
        }}
      >
        <BrandLogo id={service.brand} w={big ? 230 : 150} h={big ? 88 : 56} />
      </div>

      {/* Info block */}
      <div
        style={{
          padding: big ? "22px 24px 26px" : "14px 16px 18px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: big ? 10 : 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          {service.partner}
        </div>
        <div
          style={{
            fontFamily: "var(--serif)",
            fontSize: big ? 30 : 20,
            lineHeight: 1.1,
            marginTop: big ? 8 : 5,
            letterSpacing: "-0.01em",
          }}
        >
          {big
            ? service.title[lang].split("·").slice(-1)[0].trim()
            : service.short[lang]}
        </div>
        {big && (
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 14,
              color: "var(--muted)",
              marginTop: 7,
              lineHeight: 1.4,
            }}
          >
            {service.sub[lang]}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: big ? 16 : 12,
          }}
        >
          <div
            style={{
              padding: big ? "9px 16px" : "6px 12px",
              background: "var(--bone-2)",
              borderRadius: 999,
              fontFamily: "var(--mono)",
              fontWeight: 700,
              fontSize: big ? 13 : 11,
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
            }}
          >
            {free
              ? t.free.toUpperCase()
              : `${t.from.toUpperCase()} ${service.priceFrom} €`}
          </div>
          <div
            style={{
              width: big ? 40 : 32,
              height: big ? 40 : 32,
              borderRadius: "50%",
              background: "var(--ink)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon
              name="arrow-right"
              size={big ? 18 : 15}
              sw={2.4}
              stroke="var(--accent)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ lang, onSelect }: HomeScreenProps) {
  const t = T[lang];
  const live = SERVICES.filter((s) => s.cat === "live");
  const finance = SERVICES.filter((s) => s.cat === "finance");

  const now = new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
      {/* Header */}
      <div style={{ padding: "36px 60px 24px" }}>
        <div
          className="fade-up"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 13,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 16,
          }}
        >
          {now}
        </div>
        <h1
          className="fade-up"
          style={{
            fontFamily: "var(--serif)",
            fontSize: 100,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            margin: 0,
            paddingBottom: "0.06em",
            animationDelay: "0.05s",
          }}
        >
          {t.explore}
        </h1>
        <div
          className="fade-up"
          style={{
            fontFamily: "var(--sans)",
            fontSize: 24,
            marginTop: 18,
            color: "var(--ink-3)",
            maxWidth: 900,
            lineHeight: 1.45,
            animationDelay: "0.1s",
          }}
        >
          {t.exploreSub}
        </div>
      </div>

      {/* Live Madrid */}
      <CategoryHeader
        label={CATEGORIES.live[lang]}
        sub={CATEGORIES.live.sub[lang]}
        index={1}
        total={2}
      />
      <div
        style={{
          padding: "10px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18,
        }}
      >
        {live.slice(0, 3).map((s, i) => (
          <ServiceTile
            key={s.id}
            service={s}
            lang={lang}
            onClick={() => onSelect?.(s.id)}
            delay={i * 0.06}
            big
          />
        ))}
      </div>
      <div
        style={{
          padding: "16px 60px 0",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
        }}
      >
        {live.slice(3).map((s, i) => (
          <ServiceTile
            key={s.id}
            service={s}
            lang={lang}
            onClick={() => onSelect?.(s.id)}
            delay={0.18 + i * 0.05}
          />
        ))}
      </div>

      {/* Servicios financieros */}
      <CategoryHeader
        label={CATEGORIES.finance[lang]}
        sub={CATEGORIES.finance.sub[lang]}
        index={2}
        total={2}
        accent
      />
      <div
        style={{
          padding: "10px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 18,
        }}
      >
        {finance.slice(0, 2).map((s, i) => (
          <ServiceTile
            key={s.id}
            service={s}
            lang={lang}
            onClick={() => onSelect?.(s.id)}
            delay={0.28 + i * 0.06}
            big
          />
        ))}
      </div>
      <div
        style={{
          padding: "16px 60px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        {finance.slice(2).map((s, i) => (
          <ServiceTile
            key={s.id}
            service={s}
            lang={lang}
            onClick={() => onSelect?.(s.id)}
            delay={0.38 + i * 0.05}
          />
        ))}
      </div>

      {/* Bottom brand */}
      <div
        style={{
          padding: "24px 60px 36px",
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        powered by{" "}
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "0.4em",
            marginLeft: 8,
            color: "var(--ink)",
          }}
        >
          PROSEGUR
        </span>
      </div>
    </div>
  );
}
