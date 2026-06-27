// Formateadores en es-ES para el panel.

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("es-ES");

export function fmtEuro(v: number, decimales = false): string {
  return decimales ? eur2.format(v) : eur.format(v);
}

export function fmtNum(v: number): string {
  return num.format(v);
}

export function fmtPct(v: number, dec = 1): string {
  return `${v.toLocaleString("es-ES", { maximumFractionDigits: dec, minimumFractionDigits: dec })}%`;
}

export function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Variación porcentual entre dos valores; null si no hay base de comparación.
export function variacion(actual: number, previo: number): number | null {
  if (previo === 0) return actual === 0 ? 0 : null;
  return ((actual - previo) / previo) * 100;
}
