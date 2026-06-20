// Micro-textos de INTERFAZ del kiosko (no son catálogo del tenant).
// El catálogo (servicios, categorías, ubicaciones, marca) viene de Supabase.
// Estos son los textos POR DEFECTO (respaldo): cada tenant puede sobrescribir
// los que quiera en la base (tenants.ui_textos), y el resto cae aquí.
// La resolución tenant + respaldo vive en uiText.tsx (UiTextProvider/useUiText).

// El idioma es un texto libre (ampliable), no fijo a 2 valores.
export type Lang = string;

export const DEFAULT_UI: Record<string, Record<string, string>> = {
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
    viewCart: "Ver carrito",
    cart: "Tu carrito",
    cartEmpty: "Tu carrito está vacío",
    total: "Total",
    pay: "Pagar",
    remove: "Quitar",
    back: "Volver",
    items: "artículos",
    checkoutTitle: "Pago seguro",
    paying: "Procesando el pago…",
    paid: "¡Pago completado!",
    paidDesc: "Gracias por tu compra. Recoge los detalles en el mostrador.",
    paymentError: "No se pudo iniciar el pago",
    tryAgain: "Reintentar",
    newOrder: "Nueva compra",
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
    viewCart: "View cart",
    cart: "Your cart",
    cartEmpty: "Your cart is empty",
    total: "Total",
    pay: "Pay",
    remove: "Remove",
    back: "Back",
    items: "items",
    checkoutTitle: "Secure payment",
    paying: "Processing payment…",
    paid: "Payment complete!",
    paidDesc: "Thanks for your purchase. Collect the details at the desk.",
    paymentError: "Couldn't start the payment",
    tryAgain: "Try again",
    newOrder: "New order",
  },
};

// Mapa de idioma -> locale para formatear fechas. Respaldo: el propio código.
export const INTL_LOCALES: Record<string, string> = {
  es: "es-ES",
  en: "en-GB",
};
