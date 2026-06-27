import Link from "next/link";
import { requirePanelContext } from "@/lib/auth/context";
import { listarServicios, loc } from "@/lib/panel/catalog";
import { fmtEuro } from "@/lib/panel/format";
import {
  VisibilityToggle,
  ServiceRowActions,
} from "./ServiceRowActions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const ctx = await requirePanelContext();
  const servicios = await listarServicios(ctx.currentTenant.id);
  const localeDefault = "es";

  return (
    <>
      <div style={{ display: "flex", marginBottom: 18, alignItems: "center" }}>
        <div style={{ flex: 1 }} />
        <Link className="btn btn-accent" href="/panel/products/nuevo">
          + Nuevo servicio
        </Link>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Precio desde</th>
                <th>Pago</th>
                <th>IVA</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {servicios.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-note">Aún no hay servicios. Crea el primero.</div>
                  </td>
                </tr>
              ) : (
                servicios.map((s) => {
                  const titulo = loc(s.titulo_i18n, localeDefault);
                  return (
                    <tr key={s.id}>
                      <td className="td-strong">
                        <span
                          className="brand-dot"
                          style={{ background: s.proveedorColor ?? "var(--ink-3)" }}
                        />
                        {s.icono ? `${s.icono} ` : ""}
                        {titulo}
                      </td>
                      <td>{s.proveedorNombre}</td>
                      <td>
                        <span className="badge-soft">{s.categoriaNombre}</span>
                      </td>
                      <td className="td-strong">
                        {s.precio_desde !== null ? fmtEuro(s.precio_desde, true) : "—"}
                      </td>
                      <td>
                        <span className={`pill ${s.tipo_pago === "derivado" ? "ext" : "stripe"}`}>
                          {s.tipo_pago === "derivado" ? "Derivado" : "Stripe"}
                        </span>
                      </td>
                      <td className="mono">{s.iva_tipo !== null ? `${s.iva_tipo}%` : "—"}</td>
                      <td>
                        <VisibilityToggle id={s.id} activo={s.activo} />
                      </td>
                      <td>
                        <ServiceRowActions id={s.id} nombre={titulo} />
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
