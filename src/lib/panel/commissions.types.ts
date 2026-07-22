import type { TipoCalculo } from "@/lib/payments/commissions";

export interface ReglaBeneficiario {
  tipoCalculo: TipoCalculo;
  valor: number;
  activo: boolean;
}

export interface ComisionProveedor {
  providerId: string;
  nombre: string;
  colorMarca: string | null;
  slug: string;
  plataforma: ReglaBeneficiario | null;
  operador: ReglaBeneficiario | null;
}
