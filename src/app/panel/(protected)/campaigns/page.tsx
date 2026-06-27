import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarCampanas } from "@/lib/panel/campaigns";
import { CampaignManager } from "./CampaignManager";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const ctx = await requirePanelContext();

  if (!puedeCapacidad(ctx, "campaigns.send")) {
    return <div className="empty-note">No tienes permisos para gestionar campañas.</div>;
  }

  const campanas = await listarCampanas(ctx.currentTenant.id);
  return <CampaignManager campanas={campanas} />;
}
