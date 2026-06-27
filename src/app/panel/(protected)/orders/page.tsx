import Link from "next/link";
import { requirePanelContext } from "@/lib/auth/context";
import {
  listarPedidos,
  resumenItems,
  etiquetaEstado,
  type FiltroPedidos,
} from "@/lib/panel/orders";
import { fmtEuro, fmtFechaHora } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

const TABS: { key: FiltroPedidos["estado"]; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "paid", label: "Completados" },
  { key: "pending", label: "En proceso" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const ctx = await requirePanelContext();
  const sp = await searchParams;
  const estado = (TABS.find((t) => t.key === sp.estado)?.key ??
    "all") as FiltroPedidos["estado"];
  const q = sp.q ?? "";

  const { filas, total } = await listarPedidos(ctx.currentTenant.id, {
    estado,
    q,
  });

  function tabHref(key: FiltroPedidos["estado"]): string {
    const params = new URLSearchParams();
    if (key && key !== "all") params.set("estado", key);
    if (q) params.set("q", q);
    const s = params.toString();
    return `/panel/orders${s ? `?${s}` : ""}`;
  }

  const exportParams = new URLSearchParams();
  if (estado && estado !== "all") exportParams.set("estado", estado);
  if (q) exportParams.set("q", q);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div className="seg">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={estado === t.key ? "on" : ""}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form style={{ flex: 1, minWidth: 180 }} action="/panel/orders" method="get">
          {estado && estado !== "all" && (
            <input type="hidden" name="estado" value={estado} />
          )}
          <input
            className="input"
            name="q"
            defaultValue={q}
            placeholder="Buscar por referencia…"
            style={{ maxWidth: 280 }}
          />
        </form>
        <a
          className="btn btn-ghost"
          href={`/panel/orders/export?${exportParams.toString()}`}
        >
          Exportar CSV
        </a>
      </div>

      <div className="table-wrap">
        <div className="tw-head">
          <h3>Pedidos</h3>
          <span className="badge-soft">{total} en total</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Kiosko</th>
                <th>Servicios</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Recibo</th>
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-note">No hay pedidos que coincidan.</div>
                  </td>
                </tr>
              ) : (
                filas.map((o) => {
                  const est = etiquetaEstado(o.estado);
                  return (
                    <tr key={o.id}>
                      <td className="mono td-strong">{o.referencia ?? "—"}</td>
                      <td className="mono" style={{ color: "var(--muted)" }}>
                        {fmtFechaHora(o.paidAt ?? o.createdAt)}
                      </td>
                      <td>
                        {o.kiosko ? (
                          <span className="badge-soft">{o.kiosko}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ maxWidth: 280 }}>{resumenItems(o.items)}</td>
                      <td className="td-strong">{fmtEuro(o.importeTotal, true)}</td>
                      <td>
                        <span className={`pill ${est.cls}`}>{est.label}</span>
                      </td>
                      <td>
                        {o.reciboToken ? (
                          <a
                            className="mini-btn"
                            href={`/r/${o.reciboToken}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver recibo"
                          >
                            →
                          </a>
                        ) : (
                          "—"
                        )}
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
