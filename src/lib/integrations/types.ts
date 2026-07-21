import "server-only";

// ============================================================
// Capa de integración de proveedores.
// Un ProviderAdapter abstrae CÓMO se consulta disponibilidad y CÓMO se
// formaliza la reserva de un proveedor. El motor de stock LOCAL implementa
// el contrato hoy; el adaptador de Big Bus se enchufa cuando su API esté
// disponible, sin tocar el resto del sistema (kiosko, checkout, webhook).
// ============================================================

// Disponibilidad de un día concreto para un servicio.
export interface DiaDisponibilidad {
  restante: number;
  agotado: boolean;
}

// Mapa "YYYY-MM-DD" -> disponibilidad. Solo incluye las fechas con control de
// stock explícito (excepciones / con reservas). Las fechas ausentes se rigen
// por la capacidad diaria por defecto.
export type MapaDisponibilidad = Record<string, DiaDisponibilidad>;

// Disponibilidad completa de un servicio: capacidad por defecto (null =
// ilimitado) + excepciones por fecha.
export interface Disponibilidad {
  capacidadDiaria: number | null;
  dias: MapaDisponibilidad;
}

// Una línea a reservar tras el pago (servicio + fecha + cantidad de plazas).
export interface LineaReserva {
  serviceId: string;
  serviceSlug: string;
  titulo: string;
  fecha: string | null;
  cantidad: number;
}

// Resultado de formalizar la reserva con el proveedor.
export interface ResultadoReserva {
  ok: boolean;
  referenciaExterna: string | null;
  error: string | null;
}

// Configuración de integración por proveedor (columna providers.integracion_config).
export interface ProviderConfig {
  tipo?: "local" | "bigbus" | string;
  endpoint?: string;
  api_key_ref?: string;
  [k: string]: unknown;
}

export interface ProviderAdapter {
  readonly tipo: string;
  // Disponibilidad por fecha en una ventana [desde, hasta] (fechas ISO).
  consultarDisponibilidad(
    serviceSlug: string,
    desde: string,
    hasta: string
  ): Promise<Disponibilidad>;
  // Formaliza la reserva de las líneas de un mismo proveedor. Debe ser seguro
  // llamarlo una vez por pedido/proveedor (la idempotencia a nivel de pedido
  // la garantiza order_bookings en confirmarReservasPedido).
  confirmarReserva(lineas: LineaReserva[]): Promise<ResultadoReserva>;
}
