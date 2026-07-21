import "server-only";
import { LocalStockAdapter } from "./local";
import type {
  ProviderAdapter,
  ProviderConfig,
  Disponibilidad,
  LineaReserva,
  ResultadoReserva,
} from "./types";

// Adaptador de Big Bus. El sistema está preparado para su API real: cuando
// integracion_config incluya endpoint + api_key_ref, estas llamadas harán las
// peticiones HTTP (consulta de stock y formalización de la reserva) y mapearán
// la respuesta al contrato común. Mientras la API no esté disponible, delega
// en el stock LOCAL para que todo el flujo funcione de extremo a extremo hoy.
export class BigBusAdapter implements ProviderAdapter {
  readonly tipo = "bigbus";
  private readonly config: ProviderConfig;
  private readonly local: LocalStockAdapter;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.local = new LocalStockAdapter();
  }

  // Solo cuando hay endpoint y referencia de credencial usamos la API real.
  private get apiLista(): boolean {
    return (
      typeof this.config.endpoint === "string" &&
      this.config.endpoint.length > 0 &&
      typeof this.config.api_key_ref === "string" &&
      this.config.api_key_ref.length > 0
    );
  }

  async consultarDisponibilidad(
    serviceSlug: string,
    desde: string,
    hasta: string
  ): Promise<Disponibilidad> {
    if (!this.apiLista) {
      return this.local.consultarDisponibilidad(serviceSlug, desde, hasta);
    }
    // TODO(bigbus-api): GET `${endpoint}/availability` con la credencial de
    // `api_key_ref` (nombre de variable de entorno) y el rango [desde, hasta].
    // Mapear la respuesta de Big Bus a MapaDisponibilidad. De momento, como red
    // de seguridad, seguimos usando el stock local mientras se valida la API.
    return this.local.consultarDisponibilidad(serviceSlug, desde, hasta);
  }

  async confirmarReserva(lineas: LineaReserva[]): Promise<ResultadoReserva> {
    if (!this.apiLista) {
      return this.local.confirmarReserva(lineas);
    }
    // TODO(bigbus-api): POST `${endpoint}/bookings` con las líneas (fecha, tipo
    // de pasajero y cantidades). Devolver el localizador real de Big Bus como
    // `referenciaExterna` y sincronizar el stock local si procede.
    return this.local.confirmarReserva(lineas);
  }
}
