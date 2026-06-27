import { redirect } from "next/navigation";
import { getPanelContext, puedeCapacidad } from "@/lib/auth/context";
import { NAV_GROUPS } from "@/app/panel/_components/nav";
import { Sidebar } from "@/app/panel/_components/Sidebar";
import { Topbar } from "@/app/panel/_components/Topbar";

// El panel cambia según la sesión y el tenant activo: nunca cachear.
export const dynamic = "force-dynamic";

export default async function ProtectedPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPanelContext();
  if (!ctx) redirect("/panel/login");

  // Navegación filtrada por las capacidades del rol en el tenant activo.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.cap || puedeCapacidad(ctx, it.cap)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="pnl">
      <div className="app">
        <Sidebar
          groups={groups}
          tenants={ctx.tenants}
          current={ctx.currentTenant}
          isPlatformAdmin={ctx.isPlatformAdmin}
          userNombre={ctx.nombre}
          userEmail={ctx.email}
        />
        <main className="main">
          <Topbar />
          <div className="content">{children}</div>
        </main>
      </div>
    </div>
  );
}
