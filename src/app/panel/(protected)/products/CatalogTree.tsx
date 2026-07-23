"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProveedorMini, ServicioNodo } from "@/lib/panel/catalog";
import { fmtEuro, fmtFechaHora } from "@/lib/panel/format";
import {
  PublishToggle,
  ServiceRowActions,
  VisibilityToggle,
} from "./ServiceRowActions";

export type CatalogNode = Omit<ServicioNodo, "children" | "tiers" | "availability"> & {
  children: CatalogNode[];
  titulo: string;
};

export type CatalogProviderGroup = {
  providerId: string | null;
  nombre: string;
  color: string | null;
  slug: string | null;
  tieneFuente: boolean;
  roots: CatalogNode[];
  numServicios: number;
};

function countLeaves(nodes: CatalogNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.tipo_nodo === "servicio") n += 1;
    n += countLeaves(node.children);
  }
  return n;
}

function collectDefaultExpanded(nodes: CatalogNode[], depth = 0, out = new Set<string>()) {
  for (const n of nodes) {
    if (n.children.length > 0 && depth <= 1) {
      out.add(n.id);
      collectDefaultExpanded(n.children, depth + 1, out);
    }
  }
  return out;
}

function nodeMatches(n: CatalogNode, q: string): boolean {
  if (!q) return true;
  return (
    n.titulo.toLowerCase().includes(q) ||
    n.slug.toLowerCase().includes(q) ||
    n.categoriaNombre.toLowerCase().includes(q)
  );
}

/** Filtra el árbol conservando ancestros de coincidencias. */
function filterTree(nodes: CatalogNode[], q: string): CatalogNode[] {
  if (!q) return nodes;
  const out: CatalogNode[] = [];
  for (const n of nodes) {
    const kids = filterTree(n.children, q);
    if (nodeMatches(n, q) || kids.length > 0) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}

function collectIds(nodes: CatalogNode[], out = new Set<string>()) {
  for (const n of nodes) {
    if (n.children.length > 0) {
      out.add(n.id);
      collectIds(n.children, out);
    }
  }
  return out;
}

function esImportReciente(iso: string | null, horas = 48): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < horas * 60 * 60 * 1000;
}

function TreeRows({
  nodes,
  expanded,
  onToggle,
}: {
  nodes: CatalogNode[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {nodes.map((n) => {
        const esGrupo = n.tipo_nodo === "grupo";
        const abierto = expanded.has(n.id);
        const tieneHijos = n.children.length > 0;
        const reciente = esImportReciente(n.importado_at);
        const esNuevo =
          !!n.fuente_ref &&
          reciente &&
          esImportReciente(n.created_at) &&
          n.estado === "publicado";
        const pillEstado =
          n.estado === "publicado" ? "live" : n.estado === "despublicado" ? "paused" : "draft";
        const labelEstado =
          n.estado === "publicado"
            ? "Publicado"
            : n.estado === "despublicado"
              ? "Despublicado"
              : "Borrador";

        return (
          <div key={n.id} className="catalog-node">
            <div
              className={`catalog-row ${esGrupo ? "is-group" : "is-leaf"} ${
                n.estado !== "publicado" ? "is-dim" : ""
              }`}
              style={{ ["--depth" as string]: n.depth }}
            >
              <div className="catalog-row-main">
                {tieneHijos ? (
                  <button
                    type="button"
                    className={`catalog-chevron ${abierto ? "open" : ""}`}
                    aria-label={abierto ? "Contraer" : "Expandir"}
                    onClick={() => onToggle(n.id)}
                  >
                    ▸
                  </button>
                ) : (
                  <span className="catalog-chevron spacer" />
                )}

                {esGrupo ? (
                  <span className="badge-soft">grupo</span>
                ) : (
                  <span
                    className="brand-dot"
                    style={{ background: n.proveedorColor ?? "var(--ink-3)" }}
                  />
                )}

                <Link href={`/panel/products/${n.id}`} className="catalog-title">
                  {n.icono ? `${n.icono} ` : ""}
                  {n.titulo}
                </Link>

                {esGrupo && (
                  <span className="catalog-meta">
                    {n.children.length}{" "}
                    {n.children.length === 1 ? "hijo" : "hijos"}
                  </span>
                )}
                {esNuevo && <span className="badge-soft">nuevo</span>}
                {!esGrupo && (
                  <span className="badge-soft catalog-cat">{n.categoriaNombre}</span>
                )}
              </div>

              <div className="catalog-row-side">
                {!esGrupo && (
                  <span className="catalog-price">
                    {n.precio_desde !== null ? fmtEuro(n.precio_desde, true) : "—"}
                  </span>
                )}
                {!esGrupo && (
                  <span className={`pill ${n.tipo_pago === "derivado" ? "ext" : "stripe"}`}>
                    {n.tipo_pago === "derivado" ? "Derivado" : "Stripe"}
                  </span>
                )}
                <span className={`pill ${pillEstado}`}>{labelEstado}</span>
                {n.importado_at && (
                  <span className="catalog-imported" title="Última importación">
                    {fmtFechaHora(n.importado_at)}
                  </span>
                )}
                <VisibilityToggle id={n.id} activo={n.activo} />
                <div className="row-actions">
                  <PublishToggle id={n.id} estado={n.estado} />
                  <ServiceRowActions id={n.id} nombre={n.titulo} />
                </div>
              </div>
            </div>

            {tieneHijos && abierto && (
              <TreeRows nodes={n.children} expanded={expanded} onToggle={onToggle} />
            )}
          </div>
        );
      })}
    </>
  );
}

export function CatalogTree({
  groups,
  providers,
}: {
  groups: CatalogProviderGroup[];
  providers: ProveedorMini[];
}) {
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const g of groups) collectDefaultExpanded(g.roots, 0, ids);
    return ids;
  });

  const q = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (providerFilter === "all") return true;
        if (providerFilter === "none") return g.providerId === null;
        return g.providerId === providerFilter;
      })
      .map((g) => {
        const roots = filterTree(g.roots, q);
        return {
          ...g,
          roots,
          numServicios: countLeaves(roots),
        };
      })
      .filter((g) => g.roots.length > 0 || !q);
  }, [groups, providerFilter, q]);

  // Al buscar, expandir todos los nodos del resultado filtrado.
  const expandedEffective = useMemo(() => {
    if (!q) return expanded;
    const ids = new Set(expanded);
    for (const g of visibleGroups) collectIds(g.roots, ids);
    return ids;
  }, [q, expanded, visibleGroups]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const ids = new Set<string>();
    for (const g of visibleGroups) collectIds(g.roots, ids);
    setExpanded(ids);
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  return (
    <div className="catalog-view">
      <div className="catalog-toolbar">
        <input
          className="input catalog-search"
          type="search"
          placeholder="Buscar producto o grupo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input catalog-filter"
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
        >
          <option value="all">Todos los proveedores</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
          <option value="none">Sin proveedor</option>
        </select>
        <div className="catalog-toolbar-actions">
          <button type="button" className="mini-btn" onClick={expandAll}>
            Expandir
          </button>
          <button type="button" className="mini-btn" onClick={collapseAll}>
            Contraer
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <Link className="btn btn-ghost" href="/panel/products/import">
          Importar desde web
        </Link>
        <Link className="btn btn-accent" href="/panel/products/nuevo">
          + Nuevo nodo
        </Link>
      </div>

      {visibleGroups.length === 0 ? (
        <div className="panel">
          <div className="empty-note">
            {q
              ? "Ningún resultado para esa búsqueda."
              : "Aún no hay nodos. Crea el primero o importa desde la web."}
          </div>
        </div>
      ) : (
        <div className="catalog-providers">
          {visibleGroups.map((g) => (
            <section key={g.providerId ?? "__none"} className="catalog-provider">
              <header className="catalog-provider-head">
                <span
                  className="catalog-provider-swatch"
                  style={{ background: g.color ?? "var(--ink-3)" }}
                />
                <div className="catalog-provider-info">
                  <h2 className="catalog-provider-name">{g.nombre}</h2>
                  <p className="catalog-provider-sub">
                    {g.numServicios}{" "}
                    {g.numServicios === 1 ? "servicio" : "servicios"}
                    {g.roots.length > 0
                      ? ` · ${g.roots.length} ${g.roots.length === 1 ? "raíz" : "raíces"}`
                      : ""}
                  </p>
                </div>
                {g.tieneFuente && (
                  <Link
                    className="mini-btn"
                    href="/panel/products/import"
                    title="Importar desde web"
                  >
                    Importar
                  </Link>
                )}
              </header>
              <div className="catalog-tree">
                <TreeRows
                  nodes={g.roots}
                  expanded={expandedEffective}
                  onToggle={toggle}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
