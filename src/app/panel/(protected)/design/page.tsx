import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { getTenantConfig } from "@/lib/panel/tenant";
import { BrandingEditor } from "./BrandingEditor";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  const ctx = await requirePanelContext();
  const tenant = await getTenantConfig(ctx.currentTenant.id);
  const puedeEditar = puedeCapacidad(ctx, "design.edit");

  if (!puedeEditar) {
    return (
      <div className="empty-note">
        No tienes permisos para editar el diseño de este destino.
      </div>
    );
  }

  return <BrandingEditor tenant={tenant} />;
}
