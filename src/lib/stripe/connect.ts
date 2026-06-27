import "server-only";
import { getStripe } from "./server";

// ============================================================
// Stripe Connect (cuentas v2 tipo "recipient").
// Los proveedores son cuentas conectadas que SOLO reciben transferencias
// (Separate Charges & Transfers). La plataforma (Kioma) asume fees y pérdidas.
// El onboarding lo aloja Stripe (no gestionamos datos sensibles).
// ============================================================

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// País por defecto de las cuentas de proveedor. Stripe lo exige al crear una
// cuenta "recipient". Configurable por entorno (mercado de la plataforma).
function paisPorDefecto(): string {
  return process.env.CONNECT_COUNTRY ?? "ES";
}

export interface EstadoCuenta {
  payoutsActivos: boolean;
  estado: string;
}

// Crea una cuenta conectada v2 "recipient" para un proveedor.
export async function crearCuentaProveedor(params: {
  nombre: string;
  email: string;
  providerId: string;
  tenantSlug: string;
}): Promise<string> {
  const stripe = getStripe();
  const cuenta = await stripe.v2.core.accounts.create({
    display_name: params.nombre,
    // Obligatorio para cuentas "recipient": email de contacto del proveedor.
    contact_email: params.email,
    // Obligatorio para "recipient": país de la cuenta (mercado de la plataforma).
    identity: { country: paisPorDefecto() },
    dashboard: "express",
    defaults: {
      // La plataforma (application) asume fees y pérdidas, según las reglas.
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      // Recipient: puede recibir /v1/transfers en su saldo de Stripe.
      recipient: {
        capabilities: {
          stripe_balance: { stripe_transfers: { requested: true } },
        },
      },
    },
    metadata: { provider_id: params.providerId, tenant_slug: params.tenantSlug },
  });
  return cuenta.id;
}

// Genera un enlace de onboarding alojado por Stripe para una cuenta.
export async function crearEnlaceOnboarding(
  accountId: string,
  providerId: string
): Promise<string> {
  const stripe = getStripe();
  const base = appUrl();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: `${base}/panel/connect/refresh?provider=${providerId}`,
        return_url: `${base}/panel/connect/return?provider=${providerId}`,
      },
    },
  });
  return link.url;
}

// Lee el estado de la cuenta para saber si ya puede recibir transferencias.
export async function leerEstadoCuenta(accountId: string): Promise<EstadoCuenta> {
  const stripe = getStripe();
  const cuenta = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
  const estadoTransfers =
    cuenta.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers
      ?.status ?? "pending";
  return {
    payoutsActivos: estadoTransfers === "active",
    estado: estadoTransfers,
  };
}
