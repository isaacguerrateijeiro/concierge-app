import type { ReactNode } from "react";
import { fmtPct } from "@/lib/panel/format";

export function Delta({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="vs">sin histórico</span>;
  }
  const up = valor >= 0;
  return (
    <span className={`delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {fmtPct(Math.abs(valor))}
    </span>
  );
}

export function Kpi({
  label,
  valor,
  icon,
  iconBg,
  iconColor,
  delta,
  pie,
}: {
  label: string;
  valor: ReactNode;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  delta?: number | null;
  pie?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-ic" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
      </div>
      <div className="kpi-val">{valor}</div>
      <div className="kpi-foot">
        {delta !== undefined && <Delta valor={delta} />}
        {pie && <span className="vs">{pie}</span>}
      </div>
    </div>
  );
}
