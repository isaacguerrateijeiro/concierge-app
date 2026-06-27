import { requirePanelContext } from "@/lib/auth/context";
import { resumen, topServicios } from "@/lib/panel/metrics";
import { normalizarRango, ventanaPara } from "@/lib/panel/rangos";
import { fmtEuro, fmtNum, variacion } from "@/lib/panel/format";
import { RangeTabs } from "@/app/panel/_components/RangeTabs";
import { Kpi } from "@/app/panel/_components/Kpi";
import { BarsChart } from "@/app/panel/_components/BarsChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requirePanelContext();
  const { range } = await searchParams;
  const rango = normalizarRango(range);
  const ventana = ventanaPara(rango);

  const { actual, previo, serieRellena } = await resumen(
    ctx.currentTenant.id,
    ventana
  );
  const top = await topServicios(ctx.currentTenant.id, ventana.desde, ventana.hasta);

  const itemsPorCesta = actual.pedidos > 0 ? actual.items / actual.pedidos : 0;
  const maxTop = Math.max(1, ...top.map((t) => t.ingresos));

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <RangeTabs basePath="/panel" current={rango} />
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Ingresos"
          valor={fmtEuro(actual.ingresos)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          iconBg="var(--accent-soft)"
          iconColor="var(--warn)"
          delta={variacion(actual.ingresos, previo.ingresos)}
          pie="vs periodo anterior"
        />
        <Kpi
          label="Pedidos"
          valor={fmtNum(actual.pedidos)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2l1.5 3M18 2l-1.5 3M3 7h18l-1.5 12.5A2 2 0 0117.5 21h-11A2 2 0 014.5 19.5L3 7z" />
            </svg>
          }
          iconBg="var(--success-soft)"
          iconColor="var(--success)"
          delta={variacion(actual.pedidos, previo.pedidos)}
          pie="pagados"
        />
        <Kpi
          label="Ticket medio"
          valor={fmtEuro(actual.ticketMedio, true)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          }
          iconBg="var(--info-soft)"
          iconColor="var(--info)"
          delta={variacion(actual.ticketMedio, previo.ticketMedio)}
          pie={`${itemsPorCesta.toLocaleString("es-ES", { maximumFractionDigits: 1 })} serv./cesta`}
        />
        <Kpi
          label="Unidades vendidas"
          valor={fmtNum(actual.items)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
              <path d="M3 7l9 4 9-4M12 11v10" />
            </svg>
          }
          iconBg="var(--bone-2)"
          iconColor="var(--ink-3)"
          delta={variacion(actual.items, previo.items)}
        />
      </div>

      <div className="row r-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Ingresos por día</h3>
              <p>Pedidos pagados en el periodo</p>
            </div>
          </div>
          {actual.pedidos === 0 ? (
            <div className="empty-note">Sin pedidos en este periodo.</div>
          ) : (
            <BarsChart serie={serieRellena} />
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Servicios más vendidos</h3>
              <p>Por ingresos en el periodo</p>
            </div>
          </div>
          {top.length === 0 ? (
            <div className="empty-note">Aún no hay ventas.</div>
          ) : (
            <div>
              {top.map((s) => (
                <div
                  key={s.titulo}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom: "1px solid var(--line-2)",
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>
                    {s.titulo}
                  </span>
                  <div className="bar-inline" style={{ width: 110 }}>
                    <i style={{ width: `${(s.ingresos / maxTop) * 100}%` }} />
                  </div>
                  <span
                    className="mono"
                    style={{ fontWeight: 600, minWidth: 64, textAlign: "right" }}
                  >
                    {fmtEuro(s.ingresos, true)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
