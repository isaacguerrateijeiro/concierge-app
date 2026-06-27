"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPanelContext, TENANT_COOKIE } from "@/lib/auth/context";

// Cambia el tenant activo. Valida que el usuario tenga acceso a ese tenant.
export async function cambiarTenant(tenantId: string): Promise<void> {
  const ctx = await getPanelContext();
  if (!ctx) redirect("/panel/login");
  if (!ctx.tenants.some((t) => t.id === tenantId)) {
    throw new Error("No tienes acceso a ese cliente.");
  }
  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/panel", "layout");
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/panel/login");
}
