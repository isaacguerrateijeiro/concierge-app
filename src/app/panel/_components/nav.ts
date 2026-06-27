// Definición de la navegación del panel y títulos de cada vista.
import type { Capacidad } from "@/lib/auth/roles";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  cap?: Capacidad;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Analítica",
    items: [
      { key: "dashboard", label: "Resumen", href: "/panel" },
      { key: "sales", label: "Ventas y conversión", href: "/panel/sales" },
      { key: "orders", label: "Pedidos", href: "/panel/orders" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { key: "design", label: "Diseño del frontal", href: "/panel/design", cap: "design.edit" },
      { key: "content", label: "Textos e idiomas", href: "/panel/content", cap: "design.edit" },
      { key: "products", label: "Productos y servicios", href: "/panel/products", cap: "catalog.edit" },
      { key: "categories", label: "Categorías", href: "/panel/categories", cap: "catalog.edit" },
    ],
  },
  {
    label: "Audiencia",
    items: [
      { key: "customers", label: "Clientes y segmentos", href: "/panel/customers", cap: "customers.view" },
      { key: "campaigns", label: "Campañas", href: "/panel/campaigns", cap: "campaigns.send" },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { key: "devices", label: "Kioskos", href: "/panel/devices" },
      { key: "team", label: "Equipo y roles", href: "/panel/team" },
      { key: "settings", label: "Integraciones y pagos", href: "/panel/settings", cap: "settings.manage" },
    ],
  },
];

export const TITLES: Record<string, [string, string]> = {
  "/panel": ["Resumen", "Rendimiento de tus kioskos en tiempo real"],
  "/panel/sales": ["Ventas y conversión", "Embudo, categorías y proveedores"],
  "/panel/orders": ["Pedidos", "Operaciones realizadas en los kioskos"],
  "/panel/design": ["Diseño del frontal", "Configura la apariencia que verá el usuario"],
  "/panel/content": ["Textos e idiomas", "Edita todos los textos del kiosko, en cada idioma"],
  "/panel/products": ["Productos y servicios", "El catálogo que se vende en los kioskos"],
  "/panel/categories": ["Categorías", "Organiza la home del kiosko"],
  "/panel/customers": ["Clientes y segmentos", "Audiencia captada y su comportamiento"],
  "/panel/campaigns": ["Campañas", "Reactiva a tus clientes por SMS, WhatsApp o email"],
  "/panel/devices": ["Kioskos", "Estado y gestión remota de la flota"],
  "/panel/team": ["Equipo y roles", "Quién accede y qué puede hacer"],
  "/panel/settings": ["Integraciones y pagos", "Stripe y proveedores conectados"],
};

export function titleForPath(pathname: string): [string, string] {
  if (TITLES[pathname]) return TITLES[pathname];
  // sub-rutas: usar el prefijo más largo conocido
  const match = Object.keys(TITLES)
    .filter((p) => p !== "/panel" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLES[match] : ["Panel", ""];
}
