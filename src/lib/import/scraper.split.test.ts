import { describe, it, expect } from "vitest";
import { separarDescripcionEInstrucciones } from "./scraper";

describe("separarDescripcionEInstrucciones", () => {
  it("separa bloque ES Acceder a su boleto", () => {
    const r = separarDescripcionEInstrucciones(
      "Descubre Madrid.\n\nAcceder a su boleto: Abra la app Big Bus Tours."
    );
    expect(r.descripcion).toBe("Descubre Madrid.");
    expect(r.instrucciones).toBe("Abra la app Big Bus Tours.");
  });

  it("separa bloque EN Accessing your ticket", () => {
    const r = separarDescripcionEInstrucciones(
      "Discover Madrid.\n\nAccessing your ticket: Open the Big Bus Tours app."
    );
    expect(r.descripcion).toBe("Discover Madrid.");
    expect(r.instrucciones).toBe("Open the Big Bus Tours app.");
  });
});
