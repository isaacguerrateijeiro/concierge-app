import { requirePanelContext } from "@/lib/auth/context";
import { funnel, ventas } from "@/lib/panel/analytics";
import { normalizarRango, ventanaPara } from "@/lib/panel/rangos";
import { fmtEuro, fmtNum, fmtPct } from "@/lib/panel/format";
import { RangeTabs } from "@/app/panel/_components/RangeTabs";

export const dynamic = "force-dynamic";

const DOWS = [
  { i: 1, l: "Lun" }, { i: 2, l: "Mar" }, { i: 3, l: "Mié" }, { i: 4, l: "Jue" },
  { i: 5, l: "Vie" }, { i: 6, l: "Sáb" }, { i: 0, l: "Dom" },
];

function duracion(seg: number): string {
  if (seg <= 0) return "—";
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await requirePanelContext();
  const { range } = await searchParams;
  const rango = normalizarRango(range);
  const v = ventanaPara(rango);

  const [f, vt] = await Promise.all([
    funnel(ctx.currentTenant.id, v.desde, v.hasta),
    ventas(ctx.currentTenant.id, v.desde, v.hasta),
  ]);

  // Mapa de calor: matriz dow x hora con intensidad relativa.
  const maxHora = Math.max(1, ...f.porHora.map((p) => p.n));
  const celda = new Map<string, number>();
  for (const p of f.porHora) celda.set(`${p.dow}-${p.hora}`, p.n);

  const etapas = [
    { label: "Sesiones", val: f.sesiones, pct: 100 },
    { label: "Añadió al carrito", val: f.carrito, pct: f.tasaCarrito },
    { label: "Inició pago", val: f.checkout, pct: f.tasaCheckout },
    { label: "Compró", val: f.conversiones, pct: f.tasaConversion },
  ];

  const maxCat = Math.max(1, ...vt.categorias.map((c) => c.ingresos));
  const maxProv = Math.max(1, ...vt.proveedores.map((p) => p.ingresos));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <RangeTabs basePath="/panel/sales" current={rango} />
      </div>

      <div className="kpi-grid">
        <KpiSimple label="Sesiones" valor={fmtNum(f.sesiones)} pie="visitas al kiosko" />
        <KpiSimple label="Conversión" valor={fmtPct(f.tasaConversion)} pie="sesiones que compran" />
        <KpiSimple label="Compras" valor={fmtNum(f.conversiones)} pie="sesiones convertidas" />
        <KpiSimple label="Duración media" valor={duracion(f.duracionMediaSeg)} pie="por sesión" />
      </div>

      {f.sesiones === 0 && (
        <div className="insight" style={{ marginBottom: 22 }}>
          <span className="ai-ic">i</span>
          <p>
            Aún no hay sesiones registradas en este periodo. El kiosko empezará a enviar
            datos de uso en cuanto reciba visitas; el embudo y el mapa de calor se rellenarán solos.
          </p>
        </div>
      )}

      <div className="row r-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Embudo de conversión</h3>
              <p>De la visita a la compra</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {etapas.map((e) => (
              <div key={e.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ fontWeight: 600 }}>{e.label}</span>
                  <span className="mono">{fmtNum(e.val)} · {fmtPct(e.pct)}</span>
                </div>
                <div style={{ height: 12, background: "var(--bone-2)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(e.pct, e.val > 0 ? 3 : 0)}%`, background: "var(--accent)", borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>Actividad por hora</h3>
              <p>Sesiones por día y hora (Europe/Madrid)</p>
            </div>
          </div>
          <div className="heatmap">
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hm-hour">{h % 6 === 0 ? h : ""}</div>
            ))}
            {DOWS.map((d) => (
              <FilaCalor key={d.i} label={d.l} dow={d.i} celda={celda} max={maxHora} />
            ))}
          </div>
        </div>
      </div>

      <div className="row r-2b">
        <CorteTabla titulo="Ingresos por categoría" datos={vt.categorias} max={maxCat} conColor={false} />
        <CorteTabla titulo="Ingresos por proveedor" datos={vt.proveedores} max={maxProv} conColor />
      </div>
    </>
  );
}

function KpiSimple({ label, valor, pie }: { label: string; valor: string; pie: string }) {
  return (
    <div className="kpi">
      <div className="kpi-top"><span className="kpi-label">{label}</span></div>
      <div className="kpi-val">{valor}</div>
      <div className="kpi-foot"><span className="vs">{pie}</span></div>
    </div>
  );
}

function FilaCalor({
  label, dow, celda, max,
}: {
  label: string; dow: number; celda: Map<string, number>; max: number;
}) {
  return (
    <>
      <div className="hm-day">{label}</div>
      {Array.from({ length: 24 }, (_, h) => {
        const n = celda.get(`${dow}-${h}`) ?? 0;
        const op = n === 0 ? 0.06 : 0.2 + (n / max) * 0.8;
        return (
          <div
            key={h}
            className="hm-cell"
            style={{ opacity: op }}
            title={`${label} ${h}:00 · ${n} sesión(es)`}
          />
        );
      })}
    </>
  );
}

function CorteTabla({
  titulo, datos, max, conColor,
}: {
  titulo: string;
  datos: { nombre: string; ingresos: number; unidades: number; color?: string | null }[];
  max: number;
  conColor: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-head"><div><h3>{titulo}</h3></div></div>
      {datos.length === 0 ? (
        <div className="empty-note">Aún no hay ventas.</div>
      ) : (
        <div>
          {datos.map((c) => (
            <div key={c.nombre} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line-2)" }}>
              {conColor && (
                <span className="brand-dot" style={{ background: c.color ?? "var(--ink-3)", marginRight: 0 }} />
              )}
              <span style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>{c.nombre}</span>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{fmtNum(c.unidades)} uds.</span>
              <div className="bar-inline" style={{ width: 90 }}>
                <i style={{ width: `${(c.ingresos / max) * 100}%`, background: conColor ? (c.color ?? "var(--accent)") : "var(--accent)" }} />
              </div>
              <span className="mono" style={{ fontWeight: 600, minWidth: 64, textAlign: "right" }}>
                {fmtEuro(c.ingresos, true)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
