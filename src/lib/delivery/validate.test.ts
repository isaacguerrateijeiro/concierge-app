import { describe, it, expect } from "vitest";
import {
  validarDestino,
  canalHabilitado,
  superaTopes,
  dentroDeVentana,
  MAX_ENVIOS_POR_PEDIDO,
  MAX_ENVIOS_POR_CANAL,
  VENTANA_ENVIO_HORAS,
} from "./validate";

describe("validarDestino", () => {
  it("email válido se normaliza a minúsculas", () => {
    const r = validarDestino("email", "  Foo@Bar.COM ");
    expect(r).toEqual({ ok: true, valor: "foo@bar.com" });
  });

  it("email inválido falla", () => {
    expect(validarDestino("email", "no-es-email").ok).toBe(false);
  });

  it("teléfono E.164 válido", () => {
    expect(validarDestino("sms", "+34600000000")).toEqual({
      ok: true,
      valor: "+34600000000",
    });
    expect(validarDestino("whatsapp", "+14155552671").ok).toBe(true);
  });

  it("teléfono sin prefijo + falla", () => {
    expect(validarDestino("sms", "600000000").ok).toBe(false);
  });

  it("print no requiere destino", () => {
    expect(validarDestino("print", null)).toEqual({ ok: true, valor: null });
  });
});

describe("canalHabilitado", () => {
  it("true solo si está en la lista del tenant", () => {
    expect(canalHabilitado(["email", "print"], "email")).toBe(true);
    expect(canalHabilitado(["email", "print"], "sms")).toBe(false);
  });
});

describe("superaTopes", () => {
  it("respeta el tope total por pedido", () => {
    expect(superaTopes(MAX_ENVIOS_POR_PEDIDO, 0)).toBe(true);
    expect(superaTopes(MAX_ENVIOS_POR_PEDIDO - 1, 0)).toBe(false);
  });

  it("respeta el tope por canal", () => {
    expect(superaTopes(0, MAX_ENVIOS_POR_CANAL)).toBe(true);
    expect(superaTopes(0, MAX_ENVIOS_POR_CANAL - 1)).toBe(false);
  });
});

describe("dentroDeVentana", () => {
  it("permite justo después del pago", () => {
    const ahora = new Date("2026-01-01T12:00:00Z");
    expect(dentroDeVentana("2026-01-01T11:00:00Z", ahora)).toBe(true);
  });

  it("rechaza pasada la ventana", () => {
    const pagado = "2026-01-01T00:00:00Z";
    const ahora = new Date(
      new Date(pagado).getTime() + (VENTANA_ENVIO_HORAS + 1) * 3600 * 1000
    );
    expect(dentroDeVentana(pagado, ahora)).toBe(false);
  });

  it("rechaza si no hay paid_at o es inválido", () => {
    expect(dentroDeVentana(null)).toBe(false);
    expect(dentroDeVentana("no-fecha")).toBe(false);
  });
});
