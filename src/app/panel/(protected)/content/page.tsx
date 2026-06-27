import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { getTenantConfig } from "@/lib/panel/tenant";
import { TextEditor } from "./TextEditor";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const ctx = await requirePanelContext();
  const tenant = await getTenantConfig(ctx.currentTenant.id);

  if (!puedeCapacidad(ctx, "design.edit")) {
    return (
      <div className="empty-note">
        No tienes permisos para editar los textos de este destino.
      </div>
    );
  }

  // La unión de claves presentes en cualquier idioma es la fuente de verdad.
  const claves = Array.from(
    new Set(Object.values(tenant.uiTextos).flatMap((t) => Object.keys(t)))
  ).sort();

  return (
    <TextEditor
      locales={tenant.locales}
      localeDefault={tenant.localeDefault}
      uiTextos={tenant.uiTextos}
      claves={claves}
    />
  );
}
