export type Lang = "es" | "en";

export interface Service {
  id: string;
  icon: string;
  brand: string;
  color: string;
  accentInk: string;
  cat: "live" | "finance";
  partner: string;
  title: Record<Lang, string>;
  short: Record<Lang, string>;
  sub: Record<Lang, string>;
  priceFrom: number;
  rating?: number;
  reviews?: number;
  badge?: Record<Lang, string>;
}

export const SERVICES: Service[] = [
  {
    id: "free-tour",
    icon: "tour",
    brand: "madridapie",
    color: "#C04A2A",
    accentInk: "#fff",
    cat: "live",
    partner: "Madrid a Pie",
    title: { es: "Madrid a Pie · Free Tour", en: "Madrid a Pie · Free Tour" },
    short: { es: "Madrid a Pie", en: "Madrid a Pie" },
    sub: { es: "Casco antiguo · 2h 30 min con guía local", en: "Old town · 2h 30 min with local guide" },
    rating: 4.9,
    reviews: 12480,
    priceFrom: 0,
  },
  {
    id: "football",
    icon: "football",
    brand: "julia",
    color: "#0E2A4A",
    accentInk: "#fff",
    cat: "live",
    partner: "Julia Travel",
    title: { es: "Julia Travel · Fútbol Bernabéu", en: "Julia Travel · Bernabéu football" },
    short: { es: "Julia Travel", en: "Julia Travel" },
    sub: { es: "Entradas Real Madrid · sin colas", en: "Real Madrid tickets · skip the line" },
    rating: 4.8,
    reviews: 5210,
    priceFrom: 65,
  },
  {
    id: "taxi",
    icon: "taxi",
    brand: "bolt",
    color: "#34D186",
    accentInk: "#0E1419",
    cat: "live",
    partner: "Bolt",
    title: { es: "Bolt al Aeropuerto", en: "Bolt to the Airport" },
    short: { es: "Bolt", en: "Bolt" },
    sub: { es: "Coche premium · precio fijo", en: "Premium ride · fixed fare" },
    rating: 4.9,
    reviews: 24130,
    priceFrom: 14,
  },
  {
    id: "museum",
    icon: "museum",
    brand: "julia",
    color: "#5C2418",
    accentInk: "#fff",
    cat: "live",
    partner: "Julia Travel",
    title: { es: "Julia Travel · Museos", en: "Julia Travel · Museums" },
    short: { es: "Museos", en: "Museums" },
    sub: { es: "Prado · Reina Sofía · Thyssen", en: "Prado · Reina Sofía · Thyssen" },
    priceFrom: 18,
  },
  {
    id: "bus",
    icon: "bus",
    brand: "bigbus",
    color: "#FFD400",
    accentInk: "#0E1419",
    cat: "live",
    partner: "Big Bus · Yellow Tours",
    title: { es: "Big Bus Madrid", en: "Big Bus Madrid" },
    short: { es: "Big Bus", en: "Big Bus" },
    sub: { es: "24h hop-on / hop-off por la ciudad", en: "24h hop-on / hop-off" },
    priceFrom: 28,
  },
  {
    id: "flamenco",
    icon: "flamenco",
    brand: "julia",
    color: "#7A1E2E",
    accentInk: "#fff",
    cat: "live",
    partner: "Julia Travel",
    title: { es: "Julia Travel · Tablao Flamenco", en: "Julia Travel · Flamenco show" },
    short: { es: "Flamenco", en: "Flamenco" },
    sub: { es: "Cena + espectáculo en vivo", en: "Dinner & live show" },
    priceFrom: 49,
  },
  {
    id: "gold",
    icon: "gold",
    brand: "prosegur",
    color: "#0033A0",
    accentInk: "#fff",
    cat: "finance",
    partner: "Prosegur",
    title: { es: "Prosegur · Oro Digital", en: "Prosegur · Digital Gold" },
    short: { es: "Oro Digital", en: "Digital Gold" },
    sub: { es: "Compra y venta al precio del mercado", en: "Buy & sell at market price" },
    rating: 4.9,
    reviews: 8420,
    priceFrom: 25,
    badge: { es: "Custodia gratis 12 meses", en: "Free 12-month custody" },
  },
  {
    id: "prestapuffin",
    icon: "puffin",
    brand: "prestapuffin",
    color: "#0F4C8A",
    accentInk: "#fff",
    cat: "finance",
    partner: "Prestapuffin",
    title: { es: "Prestapuffin · Microcrédito", en: "Prestapuffin · Microloan" },
    short: { es: "Prestapuffin", en: "Prestapuffin" },
    sub: { es: "Hasta 600 € al instante · sin papeleo", en: "Up to €600 instantly · no paperwork" },
    rating: 4.7,
    reviews: 3210,
    priceFrom: 50,
    badge: { es: "Aprobación en 90 segundos", en: "Approved in 90 seconds" },
  },
  {
    id: "fx",
    icon: "fx",
    brand: "changegroup",
    color: "#E30613",
    accentInk: "#fff",
    cat: "finance",
    partner: "ChangeGroup",
    title: { es: "ChangeGroup · Divisa", en: "ChangeGroup · Currency" },
    short: { es: "ChangeGroup", en: "ChangeGroup" },
    sub: { es: "Mejor cambio del día · sin comisión", en: "Best rate today · zero commission" },
    priceFrom: 0,
  },
  {
    id: "insurance",
    icon: "insurance",
    brand: "race",
    color: "#FFCD00",
    accentInk: "#0E1419",
    cat: "finance",
    partner: "RACE",
    title: { es: "RACE · Seguro de viaje", en: "RACE · Travel insurance" },
    short: { es: "Seguro RACE", en: "RACE Insurance" },
    sub: { es: "Cobertura inmediata desde 9 €/día", en: "Instant coverage from €9/day" },
    rating: 4.8,
    reviews: 11240,
    priceFrom: 9,
    badge: { es: "Póliza al instante en tu móvil", en: "Instant policy on your phone" },
  },
];

export const CATEGORIES = {
  live: {
    es: "Live Madrid",
    en: "Live Madrid",
    sub: {
      es: "Tours, traslados y espectáculos",
      en: "Tours, transfers & shows",
    },
  },
  finance: {
    es: "Servicios financieros",
    en: "Financial services",
    sub: {
      es: "Divisa, oro, crédito y seguros",
      en: "Currency, gold, credit & insurance",
    },
  },
};

export const LOCATIONS = [
  { id: "gran-via", name: "Gran Vía", kind: { es: "Hotel · Madrid centro", en: "Hotel · Madrid centre" } },
  { id: "barajas-t4", name: "Barajas T4", kind: { es: "Aeropuerto · Llegadas", en: "Airport · Arrivals" } },
  { id: "atocha", name: "Atocha", kind: { es: "Estación AVE", en: "AVE Station" } },
  { id: "castellana", name: "Castellana", kind: { es: "Centro comercial", en: "Shopping centre" } },
];

export const T: Record<Lang, Record<string, string>> = {
  es: {
    welcome: "Bienvenido a Madrid",
    tap: "Toca para empezar",
    explore: "¿Qué te apetece hacer?",
    exploreSub: "Tu concierge digital en Madrid. Reserva, paga y disfruta — todo en un solo lugar.",
    free: "Gratis",
    from: "desde",
    concierge: "Concierge digital",
    listening: "Escuchando",
    cart: "Mi cesta",
    goPay: "Pagar todo",
  },
  en: {
    welcome: "Welcome to Madrid",
    tap: "Tap to start",
    explore: "What would you like to do?",
    exploreSub: "Your digital concierge in Madrid. Book, pay and enjoy — all in one place.",
    free: "Free",
    from: "from",
    concierge: "Digital concierge",
    listening: "Listening",
    cart: "My cart",
    goPay: "Pay all",
  },
};
