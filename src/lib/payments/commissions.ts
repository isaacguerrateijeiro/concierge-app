// ============================================================
// Cálculo del reparto de comisiones a 3 vías (plataforma / operador /
// proveedor) para una línea de pedido. Función PURA y testeable: no toca BBDD
// ni Stripe. La capa de servidor le pasa el precio y las reglas aplicables.
//
// Supuesto de negocio (Fase 2): el precio mostrado es lo que paga el cliente;
// las comisiones de "plataforma" (Kioma) y "operador" (Prosegur) salen DE ese
// precio, y el "proveedor" recibe el resto. Si en el futuro el reparto fuese
// "por encima del precio", solo cambia este módulo.
// ============================================================

export type Beneficiario = "plataforma" | "operador" | "proveedor";
export type TipoCalculo = "porcentaje" | "fijo";

// Una regla de comisión aplicable (ya filtrada por tenant/servicio/proveedor).
export interface ReglaComision {
  beneficiario: Beneficiario;
  ambito: "proveedor" | "servicio";
  tipo_calculo: TipoCalculo;
  valor: number;
}

// Resultado por beneficiario, listo para guardar en order_commissions.
export interface ComisionCalculada {
  beneficiario: Beneficiario;
  tipo_calculo: TipoCalculo | null;
  valor: number | null;
  importe: number;
}

// Redondeo a 2 decimales (céntimos), evitando errores de coma flotante.
export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Selecciona la regla aplicable para un beneficiario: la de ámbito "servicio"
// (excepción) tiene prioridad sobre la de ámbito "proveedor" (general).
function seleccionarRegla(
  reglas: ReglaComision[],
  beneficiario: Beneficiario
): ReglaComision | null {
  const delServicio = reglas.find(
    (r) => r.beneficiario === beneficiario && r.ambito === "servicio"
  );
  if (delServicio) return delServicio;
  return (
    reglas.find(
      (r) => r.beneficiario === beneficiario && r.ambito === "proveedor"
    ) ?? null
  );
}

// Calcula el reparto de UNA línea (un servicio con su cantidad).
// Devuelve siempre las 3 partes; "proveedor" es el remanente.
export function calcularComisionesLinea(params: {
  precioUnitario: number;
  cantidad: number;
  reglas: ReglaComision[];
}): ComisionCalculada[] {
  const { precioUnitario, cantidad, reglas } = params;
  const base = redondear2(precioUnitario * cantidad);

  const resultado: ComisionCalculada[] = [];
  let sumaComisiones = 0;

  for (const beneficiario of ["plataforma", "operador"] as const) {
    const regla = seleccionarRegla(reglas, beneficiario);
    let importe = 0;
    if (regla) {
      const porUnidad =
        regla.tipo_calculo === "porcentaje"
          ? precioUnitario * (regla.valor / 100)
          : regla.valor;
      importe = redondear2(porUnidad * cantidad);
    }
    sumaComisiones = redondear2(sumaComisiones + importe);
    resultado.push({
      beneficiario,
      tipo_calculo: regla?.tipo_calculo ?? null,
      valor: regla?.valor ?? null,
      importe,
    });
  }

  // El proveedor recibe lo que queda tras las comisiones (nunca negativo).
  const proveedor = redondear2(base - sumaComisiones);
  resultado.push({
    beneficiario: "proveedor",
    tipo_calculo: null,
    valor: null,
    importe: Math.max(0, proveedor),
  });

  return resultado;
}

/** Preview del reparto sobre una base (p.ej. 100 €) para UI del panel. */
export function previewReparto(params: {
  plataforma: { tipo_calculo: TipoCalculo; valor: number } | null;
  operador: { tipo_calculo: TipoCalculo; valor: number } | null;
  base?: number;
}): { plataforma: number; operador: number; proveedor: number } {
  const base = params.base ?? 100;
  const reglas: ReglaComision[] = [];
  if (params.plataforma && params.plataforma.valor > 0) {
    reglas.push({
      beneficiario: "plataforma",
      ambito: "proveedor",
      tipo_calculo: params.plataforma.tipo_calculo,
      valor: params.plataforma.valor,
    });
  }
  if (params.operador && params.operador.valor > 0) {
    reglas.push({
      beneficiario: "operador",
      ambito: "proveedor",
      tipo_calculo: params.operador.tipo_calculo,
      valor: params.operador.valor,
    });
  }
  const calc = calcularComisionesLinea({
    precioUnitario: base,
    cantidad: 1,
    reglas,
  });
  return {
    plataforma: calc.find((c) => c.beneficiario === "plataforma")?.importe ?? 0,
    operador: calc.find((c) => c.beneficiario === "operador")?.importe ?? 0,
    proveedor: calc.find((c) => c.beneficiario === "proveedor")?.importe ?? 0,
  };
}
