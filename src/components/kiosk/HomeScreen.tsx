"use client";

import { Lang, INTL_LOCALES } from "./data";
import { useUiText } from "./uiText";
import { Catalog, CatalogService, tx } from "@/lib/catalog.schema";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";

interface HomeScreenProps {
  catalog: Catalog;
  lang: Lang;
  onSelect?: (service: CatalogService) => void;
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
  service: CatalogService;
  lang: Lang;
  onClick?: () => void;
  delay?: number;
  big?: boolean;
}) {
  const t = useUiText();
  const free = service.precio_desde === 0;
  const titulo = tx(service.titulo_i18n, lang);
  // En tiles grandes mostramos la parte tras "·"; en pequeños, el proveedor.
  const tituloCorto = titulo.split("·").slice(-1)[0].trim();

  let etiquetaPrecio: string;
  if (service.precio_desde === null) {
    etiquetaPrecio = t(lang, "view").toUpperCase();
  } else if (free) {
    etiquetaPrecio = t(lang, "free").toUpperCase();
  } else {
    etiquetaPrecio = `${t(lang, "from").toUpperCase()} ${service.precio_desde} €`;
  }

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
      {/* Bloque de color de marca */}
      <div
        style={{
          background: service.proveedor.color_marca ?? "var(--ink)",
          padding: big ? "30px 24px 24px" : "20px 16px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: big ? 190 : 118,
          flexShrink: 0,
        }}
      >
        <BrandLogo id={service.proveedor.slug} w={big ? 230 : 150} h={big ? 88 : 56} />
      </div>

      {/* Bloque de información */}
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
          {service.proveedor.nombre}
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
          {big ? tituloCorto : service.proveedor.nombre}
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
            {tx(service.subtitulo_i18n, lang)}
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
            {etiquetaPrecio}
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
            <Icon name="arrow-right" size={big ? 18 : 15} sw={2.4} stroke="var(--accent)" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({ catalog, lang, onSelect }: HomeScreenProps) {
  const t = useUiText();
  const categories = [...catalog.categories].sort((a, b) => a.orden - b.orden);

  const now = new Date().toLocaleDateString(INTL_LOCALES[lang] ?? lang, {
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
      {/* Cabecera */}
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
          {t(lang, "explore")}
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
          {t(lang, "exploreSub")}
        </div>
      </div>

      {/* Una sección por categoría */}
      {categories.map((cat, ci) => {
        const servicios = catalog.services
          .filter((s) => s.categoria === cat.slug)
          .sort((a, b) => a.orden - b.orden);

        // Heurística que reproduce el diseño: más de 4 servicios -> 3 columnas,
        // si no, 2. Los primeros (= nº de columnas) van como tiles grandes.
        const columnas = servicios.length > 4 ? 3 : 2;
        const grandes = servicios.slice(0, columnas);
        const pequenos = servicios.slice(columnas);

        return (
          <div key={cat.slug}>
            <CategoryHeader
              label={tx(cat.nombre_i18n, lang)}
              sub={tx(cat.subtitulo_i18n, lang)}
              index={ci + 1}
              total={categories.length}
              accent={(ci + 1) % 2 === 0}
            />
            <div
              style={{
                padding: "10px 60px",
                display: "grid",
                gridTemplateColumns: `repeat(${columnas}, 1fr)`,
                gap: 18,
              }}
            >
              {grandes.map((s, i) => (
                <ServiceTile
                  key={s.slug}
                  service={s}
                  lang={lang}
                  onClick={() => onSelect?.(s)}
                  delay={i * 0.06}
                  big
                />
              ))}
            </div>
            {pequenos.length > 0 && (
              <div
                style={{
                  padding: "16px 60px 0",
                  display: "grid",
                  gridTemplateColumns: `repeat(${columnas}, 1fr)`,
                  gap: 14,
                }}
              >
                {pequenos.map((s, i) => (
                  <ServiceTile
                    key={s.slug}
                    service={s}
                    lang={lang}
                    onClick={() => onSelect?.(s)}
                    delay={0.18 + i * 0.05}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Marca inferior */}
      <div
        style={{
          padding: "40px 60px 36px",
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {t(lang, "poweredBy")}{" "}
        <span
          style={{
            fontWeight: 800,
            letterSpacing: "0.4em",
            marginLeft: 8,
            color: "var(--ink)",
          }}
        >
          {catalog.tenant.nombre.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
