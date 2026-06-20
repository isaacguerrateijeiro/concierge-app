import { Lang } from "./data";

const LOCALE: Record<string, string> = { es: "es-ES", en: "en-GB" };

// Formatea un importe (en unidades de moneda, p. ej. euros) según el idioma.
export function formatearImporte(amount: number, moneda: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang] ?? "es-ES", {
      style: "currency",
      currency: moneda,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${moneda}`;
  }
}
