import Link from "next/link";
import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarClientes, maskContacto } from "@/lib/panel/customers";
import { normalizarRango, ventanaPara } from "@/lib/panel/rangos";
import { fmtEuro, fmtNum, fmtFechaHora } from "@/lib/panel/format";
import { RangeTabs } from "@/app/panel/_components/RangeTabs";

export const dynamic = "force-dynamic";

const CANAL_LABEL: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", print: "Impresora",
};
const CANAL_EMOJI: Record<string, string> = {
  email: "✉️", sms: "💬", whatsapp: "🟢", print: "🖨️",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requirePanelContext();
  const { range } = await searchParams;
  const rango = normalizarRango(range);
  const v = ventanaPara(rango);

  const c = await listarClientes(ctx.currentTenant.id, v.desde, v.hasta);
  const puedeExportar = puedeCapacidad(ctx, "customers.export");

  const segmentos = [
    { ic: "👥", bg: "var(--info-soft)", nombre: "Contactos", count: c.total, desc: "Han recibido comprobante" },
    { ic: "🔁", bg: "var(--success-soft)", nombre: "Recurrentes", count: c.recurrentes, desc: "Más de un pedido" },
    { ic: "✨", bg: "var(--accent-soft)", nombre: "Nuevos", count: c.nuevos, desc: "Un único pedido" },
    { ic: "📡", bg: "var(--bone-2)", nombre: "Canales", count: Object.keys(c.porCanal).length, desc: Object.entries(c.porCanal).map(([k, n]) => `${CANAL_LABEL[k] ?? k}: ${n}`).join(" · ") || "—" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <RangeTabs basePath="/panel/customers" current={rango} />
        {puedeExportar && c.total > 0 && (
          <Link className="btn btn-ghost" href={`/panel/customers/export?range=${rango}`}>
            Exportar CSV
          </Link>
        )}
      </div>

      <div className="seg-cards">
        {segmentos.map((s) => (
          <div className="seg-card" key={s.nombre}>
            <div className="sc-ic" style={{ background: s.bg }}>{s.ic}</div>
            <div className="sc-count">{fmtNum(s.count)}</div>
            <div className="sc-name">{s.nombre}</div>
            <div className="sc-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <div className="tw-head">
          <div>
            <h3>Clientes captados</h3>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
              Contactos enmascarados por privacidad{puedeExportar ? ". Exporta para ver el detalle completo." : "."}
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Contacto</th>
                <th>Canal</th>
                <th>Pedidos</th>
                <th>Gasto</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {c.contactos.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-note">Aún no hay clientes captados en este periodo. Se registran cuando un cliente recibe su comprobante por email, SMS o WhatsApp.</div></td></tr>
              ) : (
                c.contactos.map((ct) => (
                  <tr key={ct.destino}>
                    <td className="td-strong mono">{maskContacto(ct.destino)}</td>
                    <td>{CANAL_EMOJI[ct.canal] ?? ""} {CANAL_LABEL[ct.canal] ?? ct.canal}</td>
                    <td className="td-strong">{ct.pedidos}</td>
                    <td className="mono">{fmtEuro(ct.gasto, true)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{fmtFechaHora(ct.ultima)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
