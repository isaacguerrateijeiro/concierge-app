import { notFound } from "next/navigation";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { getCategoria, getLocalesTenant } from "@/lib/panel/catalog";
import { CategoryForm } from "../CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditarCategoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const { id } = await params;
  const [categoria, locales] = await Promise.all([
    getCategoria(ctx.currentTenant.id, id),
    getLocalesTenant(ctx.currentTenant.id),
  ]);
  if (!categoria) notFound();
  return <CategoryForm categoria={categoria} locales={locales} />;
}
