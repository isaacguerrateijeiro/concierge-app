import { describe, it, expect } from "vitest";
import { renderComprobante, type DatosComprobante } from "./render";

describe("renderComprobante", () => {
  const base: DatosComprobante = {
    tenantNombre: "Prosegur",
    url: "https://kiosk.example/r/abc123",
    referencia: "ABCD2345",
    totalFormateado: "45,00 €",
    lang: "es",
    replyTo: "soporte@kioma.example",
    proveedores: [
      {
        emisor: "Julia Travel S.L.",
        nif: "B85412300",
        facturaRef: "JULIA-2026-000001",
        lineas: [
          { titulo: "Tour", cantidad: 1, importeFmt: "30,00 €", ivaTipo: 10 },
        ],
        baseFmt: "27,27 €",
        desglose: [{ tipo: 10, cuotaFmt: "2,73 €" }],
        totalFmt: "30,00 €",
        soporteEmail: "atencion@juliatravel.example",
        soporteTelefono: "+34 911 234 567",
        cancelacion: "Cancelación gratuita hasta 24h antes.",
        terminosUrl: "https://juliatravel.example/terminos",
        privacidadUrl: "https://juliatravel.example/privacidad",
      },
    ],
  };

  it("incluye el enlace al recibo en texto y HTML", () => {
    const c = renderComprobante(base);
    expect(c.textoPlano).toContain(base.url);
    expect(c.html).toContain(base.url);
    expect(c.url).toBe(base.url);
  });

  it("incluye la referencia en asunto y texto", () => {
    const c = renderComprobante(base);
    expect(c.asunto).toContain("ABCD2345");
    expect(c.textoPlano).toContain("ABCD2345");
  });

  it("asunto contiene el nombre del tenant", () => {
    const c = renderComprobante(base);
    expect(c.asunto).toContain("Prosegur");
  });

  it("incluye emisor, factura y desglose de IVA en el HTML", () => {
    const c = renderComprobante(base);
    expect(c.html).toContain("Julia Travel S.L.");
    expect(c.html).toContain("JULIA-2026-000001");
    expect(c.html).toContain("B85412300");
    expect(c.html).toContain("2,73 €");
    expect(c.html).toContain("Tour");
  });

  it("incluye soporte y cancelación", () => {
    const c = renderComprobante(base);
    expect(c.html).toContain("atencion@juliatravel.example");
    expect(c.html).toContain("Cancelación gratuita");
    expect(c.textoPlano).toContain("soporte@kioma.example");
  });

  it("propaga replyTo al comprobante", () => {
    const c = renderComprobante(base);
    expect(c.replyTo).toBe("soporte@kioma.example");
  });

  it("usa inglés cuando lang=en", () => {
    const c = renderComprobante({ ...base, lang: "en" });
    expect(c.asunto.toLowerCase()).toContain("invoice");
  });

  it("cae a español ante idioma desconocido", () => {
    const c = renderComprobante({ ...base, lang: "xx" });
    expect(c.asunto.toLowerCase()).toContain("factura");
  });

  it("escapa HTML del nombre del tenant", () => {
    const c = renderComprobante({ ...base, tenantNombre: "<b>x</b>" });
    expect(c.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(c.html).not.toContain("<b>x</b>");
  });
});
