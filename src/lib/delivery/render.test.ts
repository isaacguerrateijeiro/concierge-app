import { describe, it, expect } from "vitest";
import { renderComprobante } from "./render";

describe("renderComprobante", () => {
  const base = {
    tenantNombre: "Prosegur",
    url: "https://kiosk.example/r/abc123",
    totalFormateado: "45,00 €",
    lang: "es",
  };

  it("incluye el enlace al recibo en texto y HTML", () => {
    const c = renderComprobante(base);
    expect(c.textoPlano).toContain(base.url);
    expect(c.html).toContain(base.url);
    expect(c.url).toBe(base.url);
  });

  it("asunto contiene el nombre del tenant", () => {
    const c = renderComprobante(base);
    expect(c.asunto).toContain("Prosegur");
  });

  it("usa inglés cuando lang=en", () => {
    const c = renderComprobante({ ...base, lang: "en" });
    expect(c.asunto.toLowerCase()).toContain("receipt");
  });

  it("cae a español ante idioma desconocido", () => {
    const c = renderComprobante({ ...base, lang: "xx" });
    expect(c.asunto.toLowerCase()).toContain("comprobante");
  });

  it("escapa HTML del nombre del tenant", () => {
    const c = renderComprobante({ ...base, tenantNombre: "<b>x</b>" });
    expect(c.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(c.html).not.toContain("<b>x</b>");
  });
});
