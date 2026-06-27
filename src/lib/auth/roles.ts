// Roles del panel y matriz de permisos. Es la fuente de verdad para la UI
// (qué se muestra) y para las server actions (qué se permite). El aislamiento
// por tenant lo garantiza RLS; esto añade el control por rol dentro del tenant.

export type Rol = "owner" | "admin" | "editor" | "analista";

export const ROLES: Rol[] = ["owner", "admin", "editor", "analista"];

export const ROL_LABEL: Record<Rol, string> = {
  owner: "Propietario",
  admin: "Admin",
  editor: "Editor",
  analista: "Analista",
};

export type Capacidad =
  | "analytics.view"
  | "orders.manage"
  | "design.edit"
  | "catalog.edit"
  | "campaigns.send"
  | "customers.view"
  | "customers.export"
  | "devices.manage"
  | "team.manage"
  | "settings.manage";

// Roles que tienen cada capacidad (full grant). El platform admin (Kioma)
// tiene todas las capacidades sobre cualquier tenant (se gestiona aparte).
const MATRIZ: Record<Capacidad, Rol[]> = {
  "analytics.view": ["owner", "admin", "editor", "analista"],
  "orders.manage": ["owner", "admin", "editor"],
  "design.edit": ["owner", "admin", "editor"],
  "catalog.edit": ["owner", "admin", "editor"],
  "campaigns.send": ["owner", "admin"],
  "customers.view": ["owner", "admin", "editor", "analista"],
  "customers.export": ["owner", "admin"],
  "devices.manage": ["owner", "admin"],
  "team.manage": ["owner", "admin"],
  "settings.manage": ["owner", "admin"],
};

export function rolPuede(rol: Rol, cap: Capacidad): boolean {
  return MATRIZ[cap].includes(rol);
}

// Matriz para mostrar en la vista de Equipo (incluye estados "partial").
export type EstadoPermiso = "yes" | "no" | "partial";

export interface FilaPermiso {
  permiso: string;
  owner: EstadoPermiso;
  admin: EstadoPermiso;
  editor: EstadoPermiso;
  analista: EstadoPermiso;
}

export const MATRIZ_VISIBLE: FilaPermiso[] = [
  { permiso: "Ver analítica y KPIs", owner: "yes", admin: "yes", editor: "yes", analista: "yes" },
  { permiso: "Gestionar pedidos", owner: "yes", admin: "yes", editor: "partial", analista: "no" },
  { permiso: "Editar diseño y textos", owner: "yes", admin: "yes", editor: "yes", analista: "no" },
  { permiso: "Editar catálogo / precios", owner: "yes", admin: "yes", editor: "yes", analista: "no" },
  { permiso: "Lanzar campañas", owner: "yes", admin: "yes", editor: "no", analista: "no" },
  { permiso: "Exportar datos de clientes", owner: "yes", admin: "yes", editor: "no", analista: "partial" },
  { permiso: "Gestionar kioskos", owner: "yes", admin: "yes", editor: "no", analista: "no" },
  { permiso: "Gestionar equipo y facturación", owner: "yes", admin: "partial", editor: "no", analista: "no" },
];
