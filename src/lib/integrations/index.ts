import "server-only";
import type { ProviderAdapter, ProviderConfig } from "./types";
import { LocalStockAdapter } from "./local";
import { BigBusAdapter } from "./bigbus";

// Elige el adaptador de integración según providers.integracion_config.tipo.
// Por defecto (o si el valor es desconocido) usa el motor de stock LOCAL.
export function resolverAdapter(integracionConfig: unknown): ProviderAdapter {
  const cfg = ((integracionConfig ?? {}) as ProviderConfig) || {};
  switch (cfg.tipo) {
    case "bigbus":
      return new BigBusAdapter(cfg);
    case "local":
    default:
      return new LocalStockAdapter();
  }
}

export type {
  ProviderAdapter,
  ProviderConfig,
  Disponibilidad,
  MapaDisponibilidad,
  DiaDisponibilidad,
  LineaReserva,
  ResultadoReserva,
} from "./types";
