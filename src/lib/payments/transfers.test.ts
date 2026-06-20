import { describe, it, expect } from "vitest";
import { agruparPorProveedor, type LineaProveedor } from "./transfers";

describe("agruparPorProveedor", () => {
  it("suma las líneas del mismo proveedor", () => {
    const lineas: LineaProveedor[] = [
      { providerId: "A", importeProveedor: 10 },
      { providerId: "A", importeProveedor: 5.5 },
    ];
    expect(agruparPorProveedor(lineas)).toEqual([{ providerId: "A", importe: 15.5 }]);
  });

  it("separa importes por proveedor (carrito multi-proveedor)", () => {
    const lineas: LineaProveedor[] = [
      { providerId: "A", importeProveedor: 12 },
      { providerId: "B", importeProveedor: 8 },
      { providerId: "A", importeProveedor: 3 },
    ];
    const grupos = agruparPorProveedor(lineas);
    expect(grupos).toContainEqual({ providerId: "A", importe: 15 });
    expect(grupos).toContainEqual({ providerId: "B", importe: 8 });
    expect(grupos).toHaveLength(2);
  });

  it("redondea a 2 decimales el total agregado", () => {
    const lineas: LineaProveedor[] = [
      { providerId: "A", importeProveedor: 0.1 },
      { providerId: "A", importeProveedor: 0.2 },
    ];
    expect(agruparPorProveedor(lineas)).toEqual([{ providerId: "A", importe: 0.3 }]);
  });

  it("descarta proveedores con importe nulo o negativo", () => {
    const lineas: LineaProveedor[] = [
      { providerId: "A", importeProveedor: 0 },
      { providerId: "B", importeProveedor: -5 },
      { providerId: "C", importeProveedor: 4 },
    ];
    expect(agruparPorProveedor(lineas)).toEqual([{ providerId: "C", importe: 4 }]);
  });

  it("devuelve vacío si no hay líneas", () => {
    expect(agruparPorProveedor([])).toEqual([]);
  });
});
