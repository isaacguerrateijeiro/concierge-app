import { describe, it, expect } from "vitest";
import { generarCodigo, generarToken } from "./codigo";

describe("generarCodigo", () => {
  it("usa el formato por defecto ABCD-2345 (dos bloques de 4)", () => {
    const c = generarCodigo();
    expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("no incluye caracteres ambiguos (0,O,1,I,L)", () => {
    for (let i = 0; i < 50; i++) {
      expect(generarCodigo(6, 3)).not.toMatch(/[01OIL]/);
    }
  });

  it("respeta longitud y número de bloques", () => {
    const c = generarCodigo(5, 3);
    const partes = c.split("-");
    expect(partes).toHaveLength(3);
    for (const p of partes) expect(p).toHaveLength(5);
  });
});

describe("generarToken", () => {
  it("es url-safe (base64url, sin +/=)", () => {
    const t = generarToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("genera valores distintos (alta entropía)", () => {
    const set = new Set(Array.from({ length: 200 }, () => generarToken()));
    expect(set.size).toBe(200);
  });
});
