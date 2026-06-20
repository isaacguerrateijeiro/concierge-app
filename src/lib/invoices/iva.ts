// ============================================================
// Calculo de IVA para factura simplificada (funciones puras, testeables).
// Convencion: los precios del catalogo son "IVA incluido". Por tanto, dado el
// importe total de una linea y su tipo de IVA, se descompone en:
//   base = total / (1 + tipo/100)
//   cuota = total - base
// Se agrupa por tipo de IVA para el desglose legal.
// Sin "server-only" a proposito: se usa en servidor y se testea en Vitest.
// ============================================================

export interface LineaIva {
  /** Importe total de la linea, IVA incluido. */
  importe: number;
  /** Tipo de IVA en porcentaje (p. ej. 21, 10, 0). */
  iva_tipo: number;
}

export interface DesgloseIvaTipo {
  tipo: number;
  base: number;
  cuota: number;
}

export interface TotalesFactura {
  base_imponible: number;
  cuota_iva: number;
  total: number;
  desglose_iva: DesgloseIvaTipo[];
}

export function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Descompone una lista de lineas (IVA incluido) en base + cuota, agrupando por
// tipo. La cuota de cada tipo se calcula como total - base para que
// base + cuota == total exactamente (sin descuadres por redondeo).
export function calcularTotalesIva(lineas: LineaIva[]): TotalesFactura {
  const porTipo = new Map<number, number>();
  for (const l of lineas) {
    const tipo = Number(l.iva_tipo) || 0;
    const previo = porTipo.get(tipo) ?? 0;
    porTipo.set(tipo, redondear2(previo + Number(l.importe)));
  }

  const desglose: DesgloseIvaTipo[] = [];
  for (const [tipo, totalTipo] of porTipo) {
    const base = redondear2(totalTipo / (1 + tipo / 100));
    const cuota = redondear2(totalTipo - base);
    desglose.push({ tipo, base, cuota });
  }
  desglose.sort((a, b) => a.tipo - b.tipo);

  const base_imponible = redondear2(
    desglose.reduce((acc, d) => acc + d.base, 0)
  );
  const cuota_iva = redondear2(desglose.reduce((acc, d) => acc + d.cuota, 0));
  const total = redondear2(base_imponible + cuota_iva);

  return { base_imponible, cuota_iva, total, desglose_iva: desglose };
}

// Referencia legal de la factura: SERIE-ANIO-NNNNNN (numero a 6 digitos).
export function referenciaFactura(
  serie: string,
  anio: number,
  numero: number
): string {
  return `${serie}-${anio}-${String(numero).padStart(6, "0")}`;
}
