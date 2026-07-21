import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarKioskos } from "@/lib/panel/devices";
import { getTenantConfig } from "@/lib/panel/tenant";
import { KioskManager } from "./KioskManager";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const ctx = await requirePanelContext();
  const [kioskos, tenant] = await Promise.all([
    listarKioskos(ctx.currentTenant.id),
    getTenantConfig(ctx.currentTenant.id),
  ]);
  const puedeEditar = puedeCapacidad(ctx, "devices.manage");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );

  return (
    <KioskManager
      kioskos={kioskos}
      locales={tenant.locales}
      puedeEditar={puedeEditar}
      appUrl={appUrl}
    />
  );
}
