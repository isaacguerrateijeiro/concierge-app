"use client";

import { Lang } from "./data";
import { useUiText } from "./uiText";
import { Catalog, CatalogService, buildServiceTree, tx } from "@/lib/catalog.schema";
import { ServiceTile } from "./HomeScreen";
import Icon from "./Icon";

interface BrowseScreenProps {
  catalog: Catalog;
  lang: Lang;
  nodeSlug: string;
  onSelect: (service: CatalogService) => void;
  onBack: () => void;
}

// Busca un nodo por slug dentro del árbol (recorrido en anchura).
function buscarNodo(
  raices: ReturnType<typeof buildServiceTree>,
  slug: string
): ReturnType<typeof buildServiceTree>[number] | null {
  const cola = [...raices];
  while (cola.length) {
    const n = cola.shift()!;
    if (n.slug === slug) return n;
    cola.push(...n.children);
  }
  return null;
}

export default function BrowseScreen({
  catalog,
  lang,
  nodeSlug,
  onSelect,
  onBack,
}: BrowseScreenProps) {
  const t = useUiText();
  const raices = buildServiceTree(catalog.services);
  const nodo = buscarNodo(raices, nodeSlug);

  const hijos = nodo ? nodo.children : [];
  const columnas = hijos.length > 4 ? 3 : 2;

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
      <div style={{ padding: "36px 60px 8px" }}>
        <button
          onClick={onBack}
          className="tap"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "10px 18px",
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink)",
            cursor: "pointer",
            marginBottom: 22,
          }}
        >
          <Icon name="arrow-right" size={15} sw={2.4} stroke="var(--ink)" />
          {t(lang, "back")}
        </button>

        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 12,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: 10,
          }}
        >
          {nodo?.proveedor.nombre ?? ""}
        </div>
        <h1
          style={{
            fontFamily: "var(--serif)",
            fontSize: 72,
            lineHeight: 1.04,
            letterSpacing: "-0.025em",
            margin: 0,
          }}
        >
          {nodo ? tx(nodo.titulo_i18n, lang) : ""}
        </h1>
        {nodo && tx(nodo.subtitulo_i18n, lang) && (
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 20,
              marginTop: 14,
              color: "var(--ink-3)",
              maxWidth: 860,
              lineHeight: 1.45,
            }}
          >
            {tx(nodo.subtitulo_i18n, lang)}
          </div>
        )}
      </div>

      <div
        style={{
          padding: "20px 60px",
          display: "grid",
          gridTemplateColumns: `repeat(${columnas}, 1fr)`,
          gap: 18,
        }}
      >
        {hijos.map((s, i) => (
          <ServiceTile
            key={s.slug}
            service={s}
            lang={lang}
            onClick={() => onSelect(s)}
            delay={i * 0.05}
            big={i < columnas}
            childCount={s.children.length}
          />
        ))}
        {hijos.length === 0 && (
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 18,
              color: "var(--muted)",
              padding: "20px 0",
            }}
          >
            {t(lang, "empty")}
          </div>
        )}
      </div>
    </div>
  );
}
