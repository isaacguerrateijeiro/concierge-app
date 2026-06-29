import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import {
  listarProveedores,
  listarCategorias,
  getLocalesTenant,
  listarServicios,
  opcionesPadre,
} from "@/lib/panel/catalog";
import { ServiceForm } from "../ServiceForm";

export const dynamic = "force-dynamic";

export default async function NuevoServicioPage() {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const [proveedores, categorias, locales, servicios] = await Promise.all([
    listarProveedores(ctx.currentTenant.id),
    listarCategorias(ctx.currentTenant.id),
    getLocalesTenant(ctx.currentTenant.id),
    listarServicios(ctx.currentTenant.id),
  ]);

  return (
    <ServiceForm
      servicio={null}
      proveedores={proveedores}
      categorias={categorias}
      padres={opcionesPadre(servicios, locales[0])}
      locales={locales}
    />
  );
}
