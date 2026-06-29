import { notFound } from "next/navigation";
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

export default async function EditarServicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const { id } = await params;

  const [proveedores, categorias, locales, servicios] = await Promise.all([
    listarProveedores(ctx.currentTenant.id),
    listarCategorias(ctx.currentTenant.id),
    getLocalesTenant(ctx.currentTenant.id),
    listarServicios(ctx.currentTenant.id),
  ]);

  const servicio = servicios.find((s) => s.id === id) ?? null;
  if (!servicio) notFound();

  return (
    <ServiceForm
      servicio={servicio}
      proveedores={proveedores}
      categorias={categorias}
      padres={opcionesPadre(servicios, locales[0], id)}
      locales={locales}
    />
  );
}
