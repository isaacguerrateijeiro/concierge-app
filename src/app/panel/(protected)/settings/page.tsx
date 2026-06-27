import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { getTenantConfig } from "@/lib/panel/tenant";
import { listarProveedoresConnect, maskRemitente } from "@/lib/panel/integraciones";
import { EntregaForm, LegalForm } from "./SettingsForms";
import ConnectActions from "./ConnectActions";

export const dynamic = "force-dynamic";

function estadoConnect(p: { stripeAccountId: string | null; payoutsActivos: boolean; onboardingEstado: string | null }) {
  if (p.payoutsActivos && p.onboardingEstado === "active") return { cls: "live", txt: "Activo" };
  if (p.stripeAccountId) return { cls: "draft", txt: "Pendiente" };
  return { cls: "paused", txt: "No conectado" };
}

export default async function SettingsPage() {
  const ctx = await requirePanelContext();

  if (!puedeCapacidad(ctx, "settings.manage")) {
    return <div className="empty-note">No tienes permisos para ver integraciones y pagos.</div>;
  }

  const [tenant, proveedores] = await Promise.all([
    getTenantConfig(ctx.currentTenant.id),
    listarProveedoresConnect(ctx.currentTenant.id),
  ]);

  const remitente = (tenant.entregaConfig.remitente as Record<string, string>) ?? {};
  const remitenteMasked = [
    { label: "Email (nombre)", value: remitente.email_nombre ?? "—" },
    { label: "Email (from)", value: maskRemitente(remitente.email_from) },
    { label: "SMS (from)", value: maskRemitente(remitente.sms_from) },
    { label: "WhatsApp (from)", value: maskRemitente(remitente.whatsapp_from) },
  ];

  const conectados = proveedores.filter((p) => p.payoutsActivos).length;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div className="table-wrap">
        <div className="tw-head">
          <div>
            <h3>Pagos · Stripe Connect</h3>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
              {conectados} de {proveedores.length} proveedores listos para recibir pagos.
            </p>
          </div>
          <span className="pill stripe">Stripe</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Cuenta Connect</th>
                <th>Payouts</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => {
                const e = estadoConnect(p);
                return (
                  <tr key={p.id}>
                    <td className="td-strong">
                      <span className="brand-dot" style={{ background: p.colorMarca ?? "var(--ink-3)" }} />
                      {p.nombre}
                    </td>
                    <td className="mono">{p.stripeAccountId ?? "—"}</td>
                    <td>{p.payoutsActivos ? "Sí" : "No"}</td>
                    <td><span className={`pill ${e.cls}`}>{e.txt}</span></td>
                    <td><ConnectActions providerId={p.id} tieneCuenta={!!p.stripeAccountId} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EntregaForm entrega={tenant.entregaConfig} locales={tenant.locales} remitenteMasked={remitenteMasked} />
      <LegalForm legal={tenant.legalConfig} />
    </div>
  );
}
