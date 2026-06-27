import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Rol, Capacidad } from "@/lib/auth/roles";
import { rolPuede } from "@/lib/auth/roles";

export const TENANT_COOKIE = "panel_tenant";

export interface TenantAccesible {
  id: string;
  slug: string;
  nombre: string;
  rol: Rol;
  branding: Record<string, unknown>;
}

export interface PanelContext {
  userId: string;
  email: string;
  nombre: string;
  isPlatformAdmin: boolean;
  tenants: TenantAccesible[];
  currentTenant: TenantAccesible;
}

interface BrandingShape {
  [key: string]: unknown;
}

// Obtiene el contexto del usuario autenticado: perfil, tenants accesibles y el
// tenant activo (cookie o el primero). Devuelve null si no hay sesión o si el
// usuario no tiene acceso a ningún tenant.
export async function getPanelContext(): Promise<PanelContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, email, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isPlatformAdmin = profile?.is_platform_admin ?? false;

  let tenants: TenantAccesible[] = [];

  if (isPlatformAdmin) {
    // Kioma ve todos los tenants (RLS lo permite). Rol efectivo: owner.
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, nombre, branding")
      .order("nombre", { ascending: true });
    tenants = (data ?? []).map((t) => ({
      id: t.id,
      slug: t.slug,
      nombre: t.nombre,
      rol: "owner" as Rol,
      branding: (t.branding as BrandingShape) ?? {},
    }));
  } else {
    const { data } = await supabase
      .from("memberships")
      .select("rol, tenants(id, slug, nombre, branding)")
      .eq("user_id", user.id);
    tenants = (data ?? [])
      .filter((m) => m.tenants)
      .map((m) => {
        const t = m.tenants as unknown as {
          id: string;
          slug: string;
          nombre: string;
          branding: BrandingShape;
        };
        return {
          id: t.id,
          slug: t.slug,
          nombre: t.nombre,
          rol: m.rol as Rol,
          branding: t.branding ?? {},
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  if (tenants.length === 0) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(TENANT_COOKIE)?.value;
  const currentTenant =
    tenants.find((t) => t.id === selected) ?? tenants[0];

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    nombre: profile?.nombre ?? user.email ?? "",
    isPlatformAdmin,
    tenants,
    currentTenant,
  };
}

// Igual que getPanelContext pero lanza si no hay sesión. Para usar en páginas
// y server actions del panel donde la sesión ya está garantizada por middleware.
export async function requirePanelContext(): Promise<PanelContext> {
  const ctx = await getPanelContext();
  if (!ctx) {
    throw new Error("No autorizado: sesión no válida o sin acceso a ningún tenant.");
  }
  return ctx;
}

// Comprueba que el usuario puede realizar una capacidad en el tenant activo.
// El platform admin siempre puede. Lanza si no.
export function assertCapacidad(ctx: PanelContext, cap: Capacidad): void {
  if (ctx.isPlatformAdmin) return;
  if (!rolPuede(ctx.currentTenant.rol, cap)) {
    throw new Error(`No tienes permiso para esta acción (${cap}).`);
  }
}

export function puedeCapacidad(ctx: PanelContext, cap: Capacidad): boolean {
  if (ctx.isPlatformAdmin) return true;
  return rolPuede(ctx.currentTenant.rol, cap);
}
