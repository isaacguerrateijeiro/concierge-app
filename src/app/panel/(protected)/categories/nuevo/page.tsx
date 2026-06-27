import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { getLocalesTenant } from "@/lib/panel/catalog";
import { CategoryForm } from "../CategoryForm";

export const dynamic = "force-dynamic";

export default async function NuevaCategoriaPage() {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const locales = await getLocalesTenant(ctx.currentTenant.id);
  return <CategoryForm categoria={null} locales={locales} />;
}
