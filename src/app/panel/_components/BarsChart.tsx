import type { PuntoSerie } from "@/lib/panel/metrics";
import { fmtEuro } from "@/lib/panel/format";

function etiquetaDia(iso: string, total: number): string {
  const d = new Date(iso + "T00:00:00");
  if (total <= 14)
    return d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "");
  if (total <= 31) return String(d.getDate());
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

// Gráfica de barras de ingresos por día, renderizada en servidor.
export function BarsChart({ serie }: { serie: PuntoSerie[] }) {
  const max = Math.max(1, ...serie.map((p) => p.ingresos));
  const total = serie.length;
  const mostrarEtiqueta = total <= 31;

  return (
    <div className="bars">
      {serie.map((p) => {
        const h = (p.ingresos / max) * 100;
        return (
          <div className="bar-col" key={p.dia}>
            <div
              className="bar-stack"
              style={{ height: `${Math.max(h, 1)}%` }}
              title={`${etiquetaDia(p.dia, total)} · ${fmtEuro(p.ingresos, true)} · ${p.pedidos} pedidos`}
            >
              <div
                className="bar-seg"
                style={{ height: "100%", background: "var(--accent)" }}
              />
            </div>
            {mostrarEtiqueta && (
              <span className="bar-label">{etiquetaDia(p.dia, total)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
