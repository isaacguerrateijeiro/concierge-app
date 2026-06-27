import Link from "next/link";
import { requirePanelContext } from "@/lib/auth/context";
import { listarCategorias, loc } from "@/lib/panel/catalog";
import { CategoryCardActions } from "./CategoryCardActions";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const ctx = await requirePanelContext();
  const cats = await listarCategorias(ctx.currentTenant.id);
  const localeDefault = "es";

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 12,
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          Usa las flechas para ordenar cómo aparecen en la home del kiosko.
        </p>
        <Link className="btn btn-accent" href="/panel/categories/nuevo">
          + Nueva categoría
        </Link>
      </div>

      {cats.length === 0 ? (
        <div className="panel">
          <div className="empty-note">Aún no hay categorías. Crea la primera.</div>
        </div>
      ) : (
        <div className="row r-3">
          {cats.map((c, i) => (
            <div className="seg-card" key={c.id}>
              <div className="sc-name">{loc(c.nombre_i18n, localeDefault)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span className="badge-soft">{c.numServicios} servicios</span>
                <span className={`pill ${c.activo ? "live" : "paused"}`} style={{ fontSize: 10 }}>
                  {c.activo ? "Visible" : "Oculta"}
                </span>
              </div>
              {loc(c.subtitulo_i18n, localeDefault) && (
                <div className="sc-desc">{loc(c.subtitulo_i18n, localeDefault)}</div>
              )}
              <CategoryCardActions
                id={c.id}
                nombre={loc(c.nombre_i18n, localeDefault)}
                activo={c.activo}
                esPrimera={i === 0}
                esUltima={i === cats.length - 1}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
