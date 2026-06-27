"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  crearCuentaProveedor,
  crearEnlaceOnboarding,
  leerEstadoCuenta,
} from "@/lib/stripe/connect";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";

// Autoriza la operación de Connect: exige sesión de panel y capacidad de
// gestión. Devuelve el tenant activo para acotar la operación (multi-tenant).
async function autorizarTenant(): Promise<string> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "settings.manage");
  return ctx.currentTenant.id;
}

// Inicia (o reanuda) el onboarding de Connect de un proveedor: crea la cuenta
// conectada si no existe y devuelve el enlace de onboarding alojado por Stripe.
export async function iniciarOnboardingProveedor(
  providerId: string
): Promise<string> {
  const tenantId = await autorizarTenant();
  const supabase = createSupabaseAdminClient();

  const { data: provider, error } = await supabase
    .from("providers")
    .select("id, nombre, slug, stripe_account_id, tenant_id, tenants(slug)")
    .eq("id", providerId)
    .single();
  if (error || !provider) {
    throw new Error(`Proveedor no encontrado: ${error?.message ?? providerId}`);
  }
  if (provider.tenant_id !== tenantId) {
    throw new Error("No autorizado: el proveedor no pertenece a este destino.");
  }

  let accountId = provider.stripe_account_id;
  if (!accountId) {
    const tenantSlug =
      (provider.tenants as { slug: string } | null)?.slug ?? "desconocido";
    // Email de contacto: hasta el panel real (Fase 3b) no guardamos email de
    // proveedor, así que lo derivamos del slug con un dominio configurable.
    const dominio = process.env.CONNECT_EMAIL_DOMAIN ?? "example.com";
    accountId = await crearCuentaProveedor({
      nombre: provider.nombre,
      email: `${provider.slug}@${dominio}`,
      providerId: provider.id,
      tenantSlug,
    });
    const { error: errUpd } = await supabase
      .from("providers")
      .update({ stripe_account_id: accountId, stripe_onboarding_estado: "pending" })
      .eq("id", provider.id);
    if (errUpd) {
      throw new Error(`No se pudo guardar la cuenta de Stripe: ${errUpd.message}`);
    }
  }

  return crearEnlaceOnboarding(accountId, provider.id);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Sincroniza el estado de la cuenta del proveedor con Stripe (si ya puede
// recibir transferencias). Devuelve true si está lista para cobrar.
//
// `esperarActivo`: justo al volver del onboarding, Stripe puede tardar unos
// segundos en activar la capacidad de transferencias. Si se pide, reintentamos
// leer el estado con espera corta hasta que quede `active`, para no guardar un
// estado transitorio (p. ej. `restricted`) que dejaría al proveedor "pegado".
export async function sincronizarEstadoProveedor(
  providerId: string,
  esperarActivo = false
): Promise<boolean> {
  const tenantId = await autorizarTenant();
  const supabase = createSupabaseAdminClient();

  const { data: provider, error } = await supabase
    .from("providers")
    .select("id, stripe_account_id, tenant_id")
    .eq("id", providerId)
    .single();
  if (error || !provider) {
    throw new Error(`Proveedor no encontrado: ${error?.message ?? providerId}`);
  }
  if (provider.tenant_id !== tenantId) {
    throw new Error("No autorizado: el proveedor no pertenece a este destino.");
  }
  if (!provider.stripe_account_id) return false;

  // Reintentos solo cuando se espera la activación (al volver del onboarding).
  const esperas = esperarActivo ? [0, 1500, 2500, 3500] : [0];
  let estado = await leerEstadoCuenta(provider.stripe_account_id);
  for (let i = 1; i < esperas.length && !estado.payoutsActivos; i++) {
    await dormir(esperas[i]);
    estado = await leerEstadoCuenta(provider.stripe_account_id);
  }

  const { error: errUpd } = await supabase
    .from("providers")
    .update({
      stripe_payouts_activos: estado.payoutsActivos,
      stripe_onboarding_estado: estado.estado,
    })
    .eq("id", provider.id);
  if (errUpd) {
    throw new Error(`No se pudo actualizar el estado: ${errUpd.message}`);
  }
  return estado.payoutsActivos;
}
