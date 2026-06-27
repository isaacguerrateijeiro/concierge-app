// Rangos de fecha del panel (compartidos entre Resumen, Ventas, etc.).

export type RangoKey = "24h" | "7d" | "30d" | "90d";

export const RANGOS: { key: RangoKey; label: string; dias: number }[] = [
  { key: "24h", label: "24 h", dias: 1 },
  { key: "7d", label: "7 días", dias: 7 },
  { key: "30d", label: "30 días", dias: 30 },
  { key: "90d", label: "Trimestre", dias: 90 },
];

export function normalizarRango(value: string | undefined): RangoKey {
  return (RANGOS.find((r) => r.key === value)?.key ?? "7d") as RangoKey;
}

export interface VentanaTiempo {
  desde: Date;
  hasta: Date;
  desdePrev: Date;
  hastaPrev: Date;
  dias: number;
}

// Calcula la ventana actual y la anterior (mismo tamaño) para deltas.
export function ventanaPara(rango: RangoKey, ahora = new Date()): VentanaTiempo {
  const dias = RANGOS.find((r) => r.key === rango)?.dias ?? 7;
  const ms = dias * 24 * 60 * 60 * 1000;
  const hasta = ahora;
  const desde = new Date(hasta.getTime() - ms);
  const hastaPrev = desde;
  const desdePrev = new Date(desde.getTime() - ms);
  return { desde, hasta, desdePrev, hastaPrev, dias };
}
