import Link from "next/link";
import { requirePanelContext } from "@/lib/auth/context";
import { listarServicios, arbolServicios, loc } from "@/lib/panel/catalog";
import { fmtEuro } from "@/lib/panel/format";
import {
  VisibilityToggle,
  PublishToggle,
  ServiceRowActions,
} from "./ServiceRowActions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const ctx = await requirePanelContext();
  const servicios = await listarServicios(ctx.currentTenant.id);
  const nodos = arbolServicios(servicios);
  const localeDefault = "es";

  return (
    <>
      <div style={{ display: "flex", marginBottom: 18, alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }} />
        <Link className="btn btn-ghost" href="/panel/products/import">
          Importar desde web
        </Link>
        <Link className="btn btn-accent" href="/panel/products/nuevo">
          + Nuevo nodo
        </Link>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nodo</th>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Precio desde</th>
                <th>Pago</th>
                <th>IVA</th>
                <th>Estado</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {nodos.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-note">Aún no hay nodos. Crea el primero o importa desde la web.</div>
                  </td>
                </tr>
              ) : (
                nodos.map((s) => {
                  const titulo = loc(s.titulo_i18n, localeDefault);
                  const esGrupo = s.tipo_nodo === "grupo";
                  return (
                    <tr key={s.id} style={s.estado === "borrador" ? { opacity: 0.7 } : undefined}>
                      <td className="td-strong">
                        <span style={{ display: "inline-block", width: s.depth * 22 }} />
                        {esGrupo ? (
                          <span className="badge-soft" style={{ marginRight: 8 }}>grupo</span>
                        ) : (
                          <span
                            className="brand-dot"
                            style={{ background: s.proveedorColor ?? "var(--ink-3)" }}
                          />
                        )}
                        {s.icono ? `${s.icono} ` : ""}
                        {titulo}
                      </td>
                      <td>{s.proveedorNombre}</td>
                      <td>
                        <span className="badge-soft">{s.categoriaNombre}</span>
                      </td>
                      <td className="td-strong">
                        {esGrupo ? "—" : s.precio_desde !== null ? fmtEuro(s.precio_desde, true) : "—"}
                      </td>
                      <td>
                        {esGrupo ? (
                          "—"
                        ) : (
                          <span className={`pill ${s.tipo_pago === "derivado" ? "ext" : "stripe"}`}>
                            {s.tipo_pago === "derivado" ? "Derivado" : "Stripe"}
                          </span>
                        )}
                      </td>
                      <td className="mono">{!esGrupo && s.iva_tipo !== null ? `${s.iva_tipo}%` : "—"}</td>
                      <td>
                        <span className={`pill ${s.estado === "publicado" ? "live" : "draft"}`}>
                          {s.estado === "publicado" ? "Publicado" : "Borrador"}
                        </span>
                      </td>
                      <td>
                        <VisibilityToggle id={s.id} activo={s.activo} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <PublishToggle id={s.id} estado={s.estado} />
                          <ServiceRowActions id={s.id} nombre={titulo} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
