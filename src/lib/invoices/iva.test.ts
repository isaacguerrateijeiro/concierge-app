import { describe, it, expect } from "vitest";
import { calcularTotalesIva, referenciaFactura, redondear2 } from "./iva";

describe("calcularTotalesIva", () => {
  it("descompone un importe con IVA 21% incluido", () => {
    const r = calcularTotalesIva([{ importe: 121, iva_tipo: 21 }]);
    expect(r.base_imponible).toBe(100);
    expect(r.cuota_iva).toBe(21);
    expect(r.total).toBe(121);
    expect(r.desglose_iva).toEqual([{ tipo: 21, base: 100, cuota: 21 }]);
  });

  it("descompone IVA 10% incluido", () => {
    const r = calcularTotalesIva([{ importe: 30, iva_tipo: 10 }]);
    // 30 / 1.10 = 27.2727... -> 27.27 ; cuota = 2.73
    expect(r.base_imponible).toBe(27.27);
    expect(r.cuota_iva).toBe(2.73);
    expect(r.total).toBe(30);
  });

  it("agrupa varias líneas del mismo tipo", () => {
    const r = calcularTotalesIva([
      { importe: 30, iva_tipo: 10 },
      { importe: 20, iva_tipo: 10 },
    ]);
    expect(r.desglose_iva).toHaveLength(1);
    expect(r.desglose_iva[0].tipo).toBe(10);
    expect(r.total).toBe(50);
    expect(redondear2(r.base_imponible + r.cuota_iva)).toBe(50);
  });

  it("maneja varios tipos de IVA y los ordena", () => {
    const r = calcularTotalesIva([
      { importe: 121, iva_tipo: 21 },
      { importe: 30, iva_tipo: 10 },
    ]);
    expect(r.desglose_iva.map((d) => d.tipo)).toEqual([10, 21]);
    expect(r.total).toBe(151);
    expect(redondear2(r.base_imponible + r.cuota_iva)).toBe(151);
  });

  it("trata IVA 0% (base = total, cuota = 0)", () => {
    const r = calcularTotalesIva([{ importe: 50, iva_tipo: 0 }]);
    expect(r.base_imponible).toBe(50);
    expect(r.cuota_iva).toBe(0);
    expect(r.desglose_iva).toEqual([{ tipo: 0, base: 50, cuota: 0 }]);
  });

  it("base + cuota cuadra exactamente con el total por tipo", () => {
    const r = calcularTotalesIva([{ importe: 99.99, iva_tipo: 21 }]);
    expect(redondear2(r.base_imponible + r.cuota_iva)).toBe(99.99);
  });
});

describe("referenciaFactura", () => {
  it("formatea SERIE-ANIO-NNNNNN con 6 dígitos", () => {
    expect(referenciaFactura("JULIA", 2026, 123)).toBe("JULIA-2026-000123");
    expect(referenciaFactura("BOLT", 2026, 1)).toBe("BOLT-2026-000001");
    expect(referenciaFactura("X", 2026, 1000000)).toBe("X-2026-1000000");
  });
});
