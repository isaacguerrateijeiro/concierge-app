// Micro-textos de INTERFAZ del kiosko (no son catálogo del tenant).
// El catálogo (servicios, categorías, ubicaciones, marca) viene de Supabase.
// Pendiente futuro: mover también estos textos a datos configurables.

// El idioma es un texto libre (ampliable), no fijo a 2 valores.
export type Lang = string;

export const UI: Record<string, Record<string, string>> = {
  es: {
    concierge: "Concierge digital",
    hello: "Hola",
    tap: "Toca para empezar",
    listening: "Escuchando",
    explore: "¿Qué te apetece hacer?",
    exploreSub:
      "Tu concierge digital. Reserva, paga y disfruta — todo en un solo lugar.",
    attractDesc:
      "Tours, taxis, museos, divisa…\nUn único asistente para tu visita.",
    free: "Gratis",
    from: "desde",
    view: "Ver",
    poweredBy: "powered by",
  },
  en: {
    concierge: "Digital concierge",
    hello: "Hola",
    tap: "Tap to start",
    listening: "Listening",
    explore: "What would you like to do?",
    exploreSub:
      "Your digital concierge. Book, pay and enjoy — all in one place.",
    attractDesc:
      "Tours, taxis, museums, currency…\nOne assistant for your whole visit.",
    free: "Free",
    from: "from",
    view: "View",
    poweredBy: "powered by",
  },
};

// Devuelve un micro-texto de interfaz, con respaldo a español y luego a la clave.
export function ui(lang: string, key: string): string {
  return UI[lang]?.[key] ?? UI.es?.[key] ?? key;
}

// Mapa de idioma -> locale para formatear fechas. Respaldo: el propio código.
export const INTL_LOCALES: Record<string, string> = {
  es: "es-ES",
  en: "en-GB",
};
