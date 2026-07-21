import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePanelContext } from "@/lib/auth/context";
import { obtenerCliente } from "@/lib/panel/customers";
import { etiquetaEstado } from "@/lib/panel/orders";
import { fmtEuro, fmtFechaHora, fmtNum } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

const CANAL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  print: "Impresora",
};

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePanelContext();
  const { id } = await params;
  const cliente = await obtenerCliente(ctx.currentTenant.id, id);
  if (!cliente) notFound();

  const alias = cliente.contactos.length > 0
    ? cliente.contactos
    : [{ destino: cliente.destino, canal: cliente.canal }];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link href="/panel/customers" className="btn btn-ghost" style={{ marginBottom: 14 }}>
          ← Clientes
        </Link>
        <h2 style={{ margin: "0 0 6px", fontSize: 22 }}>Ficha de cliente</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>
          Contactos unificados por email/teléfono o por apariciones en el mismo pedido.
        </p>
      </div>

      <div className="seg-cards" style={{ marginBottom: 22 }}>
        <div className="seg-card">
          <div className="sc-ic" style={{ background: "var(--info-soft)" }}>📦</div>
          <div className="sc-count">{fmtNum(cliente.pedidos)}</div>
          <div className="sc-name">Pedidos</div>
          <div className="sc-desc">Pagados con comprobante</div>
        </div>
        <div className="seg-card">
          <div className="sc-ic" style={{ background: "var(--success-soft)" }}>💶</div>
          <div className="sc-count" style={{ fontSize: 22 }}>{fmtEuro(cliente.gasto, true)}</div>
          <div className="sc-name">Gasto total</div>
          <div className="sc-desc">Suma de pedidos</div>
        </div>
        <div className="seg-card">
          <div className="sc-ic" style={{ background: "var(--accent-soft)" }}>📡</div>
          <div className="sc-count" style={{ fontSize: 18 }}>
            {cliente.canales.map((c) => CANAL_LABEL[c] ?? c).join(" · ") || "—"}
          </div>
          <div className="sc-name">Canales</div>
          <div className="sc-desc">Usados para el comprobante</div>
        </div>
        <div className="seg-card">
          <div className="sc-ic" style={{ background: "var(--bone-2)" }}>🕒</div>
          <div className="sc-count" style={{ fontSize: 16 }}>
            {cliente.ultima ? fmtFechaHora(cliente.ultima) : "—"}
          </div>
          <div className="sc-name">Último pedido</div>
          <div className="sc-desc">Actividad más reciente</div>
        </div>
      </div>

      <div className="table-wrap" style={{ marginBottom: 22 }}>
        <div className="tw-head">
          <h3>Contactos</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Destino</th>
                <th>Canal</th>
              </tr>
            </thead>
            <tbody>
              {alias.map((a) => (
                <tr key={`${a.canal}:${a.destino}`}>
                  <td className="td-strong mono">{a.destino}</td>
                  <td>{CANAL_LABEL[a.canal] ?? a.canal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-wrap">
        <div className="tw-head">
          <h3>Pedidos</h3>
          <span className="badge-soft">{cliente.historial.length} en total</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Fecha</th>
                <th>Kiosko</th>
                <th>Canales</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Recibo</th>
              </tr>
            </thead>
            <tbody>
              {cliente.historial.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-note">Sin pedidos asociados.</div>
                  </td>
                </tr>
              ) : (
                cliente.historial.map((o) => {
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
                      <td>
                        {o.canales.map((c) => CANAL_LABEL[c] ?? c).join(" · ") || "—"}
                      </td>
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
                            rel="noopener noreferrer"
                          >
                            Ver →
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
