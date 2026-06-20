import { describe, it, expect } from "vitest";
import {
  calcularComisionesLinea,
  redondear2,
  type ReglaComision,
} from "./commissions";

// Reglas típicas de Prosegur: plataforma 8% + operador 5% (ámbito proveedor).
const reglasProveedor: ReglaComision[] = [
  { beneficiario: "plataforma", ambito: "proveedor", tipo_calculo: "porcentaje", valor: 8 },
  { beneficiario: "operador", ambito: "proveedor", tipo_calculo: "porcentaje", valor: 5 },
];

describe("calcularComisionesLinea", () => {
  it("reparte porcentajes y deja el resto al proveedor", () => {
    const r = calcularComisionesLinea({
      precioUnitario: 100,
      cantidad: 1,
      reglas: reglasProveedor,
    });
    const byBen = Object.fromEntries(r.map((c) => [c.beneficiario, c.importe]));
    expect(byBen.plataforma).toBe(8);
    expect(byBen.operador).toBe(5);
    expect(byBen.proveedor).toBe(87);
    expect(redondear2(byBen.plataforma + byBen.operador + byBen.proveedor)).toBe(100);
  });

  it("multiplica por la cantidad", () => {
    const r = calcularComisionesLinea({
      precioUnitario: 50,
      cantidad: 3,
      reglas: reglasProveedor,
    });
    const byBen = Object.fromEntries(r.map((c) => [c.beneficiario, c.importe]));
    // base 150 -> plataforma 12, operador 7.5, proveedor 130.5
    expect(byBen.plataforma).toBe(12);
    expect(byBen.operador).toBe(7.5);
    expect(byBen.proveedor).toBe(130.5);
  });

  it("la regla de ámbito servicio tiene prioridad sobre la de proveedor", () => {
    const reglas: ReglaComision[] = [
      ...reglasProveedor,
      { beneficiario: "plataforma", ambito: "servicio", tipo_calculo: "porcentaje", valor: 20 },
    ];
    const r = calcularComisionesLinea({ precioUnitario: 100, cantidad: 1, reglas });
    const plataforma = r.find((c) => c.beneficiario === "plataforma");
    expect(plataforma?.importe).toBe(20);
    expect(plataforma?.valor).toBe(20);
  });

  it("admite comisiones fijas", () => {
    const reglas: ReglaComision[] = [
      { beneficiario: "plataforma", ambito: "proveedor", tipo_calculo: "fijo", valor: 3 },
    ];
    const r = calcularComisionesLinea({ precioUnitario: 40, cantidad: 2, reglas });
    const byBen = Object.fromEntries(r.map((c) => [c.beneficiario, c.importe]));
    // fijo 3/unidad * 2 = 6; operador sin regla = 0; proveedor 80 - 6 = 74
    expect(byBen.plataforma).toBe(6);
    expect(byBen.operador).toBe(0);
    expect(byBen.proveedor).toBe(74);
  });

  it("sin reglas: todo va al proveedor", () => {
    const r = calcularComisionesLinea({ precioUnitario: 25, cantidad: 1, reglas: [] });
    const byBen = Object.fromEntries(r.map((c) => [c.beneficiario, c.importe]));
    expect(byBen.plataforma).toBe(0);
    expect(byBen.operador).toBe(0);
    expect(byBen.proveedor).toBe(25);
  });

  it("nunca deja el importe del proveedor en negativo", () => {
    const reglas: ReglaComision[] = [
      { beneficiario: "plataforma", ambito: "proveedor", tipo_calculo: "porcentaje", valor: 80 },
      { beneficiario: "operador", ambito: "proveedor", tipo_calculo: "porcentaje", valor: 40 },
    ];
    const r = calcularComisionesLinea({ precioUnitario: 10, cantidad: 1, reglas });
    const proveedor = r.find((c) => c.beneficiario === "proveedor");
    expect(proveedor?.importe).toBe(0);
  });
});
