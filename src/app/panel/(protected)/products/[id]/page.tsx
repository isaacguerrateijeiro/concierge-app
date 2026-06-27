import { notFound } from "next/navigation";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import {
  listarProveedores,
  listarCategorias,
  getLocalesTenant,
  getServicio,
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

  const [servicio, proveedores, categorias, locales] = await Promise.all([
    getServicio(ctx.currentTenant.id, id),
    listarProveedores(ctx.currentTenant.id),
    listarCategorias(ctx.currentTenant.id),
    getLocalesTenant(ctx.currentTenant.id),
  ]);

  if (!servicio) notFound();

  return (
    <ServiceForm
      servicio={servicio}
      proveedores={proveedores}
      categorias={categorias}
      locales={locales}
    />
  );
}
