import { describe, it, expect } from "vitest";
import { catalogSchema, tx } from "./catalog.schema";

// Catálogo mínimo válido, con la misma forma que devuelve get_catalog().
const validCatalog = {
  tenant: {
    slug: "prosegur",
    nombre: "Prosegur",
    branding: { colors: { ink: "#16140F" }, mark: "M", extra: "ok" },
    locales: ["es", "en"],
    locale_default: "es",
  },
  locations: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      nombre: "Recepción",
      tipo_i18n: { es: "Vestíbulo" },
      orden: 1,
    },
  ],
  categories: [
    {
      slug: "live",
      nombre_i18n: { es: "En vivo", en: "Live" },
      subtitulo_i18n: { es: "Ahora" },
      orden: 1,
    },
  ],
  services: [
    {
      slug: "taxi",
      titulo_i18n: { es: "Taxi", en: "Taxi" },
      subtitulo_i18n: { es: "Al aeropuerto" },
      tipo_pago: "integrado",
      precio_desde: 35,
      moneda: "EUR",
      url_redireccion: null,
      icono: "car",
      orden: 1,
      categoria: "live",
      proveedor: { slug: "cabify", nombre: "Cabify", color_marca: "#6E00FF", logo: null },
    },
  ],
};

describe("catalogSchema", () => {
  it("acepta un catálogo válido y conserva claves extra del branding", () => {
    const result = catalogSchema.safeParse(validCatalog);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenant.branding).toMatchObject({ extra: "ok" });
      expect(result.data.services[0].tipo_pago).toBe("integrado");
    }
  });

  it("acepta servicios derivados con precio nulo", () => {
    const derived = structuredClone(validCatalog);
    const svc = derived.services[0] as { tipo_pago: string; precio_desde: number | null };
    svc.tipo_pago = "derivado";
    svc.precio_desde = null;
    expect(catalogSchema.safeParse(derived).success).toBe(true);
  });

  it("rechaza un tipo_pago no contemplado", () => {
    const bad = structuredClone(validCatalog);
    (bad.services[0] as { tipo_pago: string }).tipo_pago = "regalo";
    expect(catalogSchema.safeParse(bad).success).toBe(false);
  });

  it("rechaza si falta el tenant", () => {
    const bad = structuredClone(validCatalog) as Record<string, unknown>;
    delete bad.tenant;
    expect(catalogSchema.safeParse(bad).success).toBe(false);
  });

  it("rechaza precio_desde como texto", () => {
    const bad = structuredClone(validCatalog) as unknown as {
      services: { precio_desde: unknown }[];
    };
    bad.services[0].precio_desde = "35";
    expect(catalogSchema.safeParse(bad).success).toBe(false);
  });
});

describe("tx", () => {
  it("devuelve el texto del idioma pedido", () => {
    expect(tx({ es: "Hola", en: "Hello" }, "en")).toBe("Hello");
  });

  it("hace fallback al primer idioma disponible si falta el pedido", () => {
    expect(tx({ es: "Hola" }, "en")).toBe("Hola");
  });

  it("devuelve cadena vacía si el valor es nulo o indefinido", () => {
    expect(tx(null, "es")).toBe("");
    expect(tx(undefined, "es")).toBe("");
  });
});
