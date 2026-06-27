import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarMiembros } from "@/lib/panel/team";
import { MATRIZ_VISIBLE, type EstadoPermiso } from "@/lib/auth/roles";
import { TeamManager } from "./TeamManager";

export const dynamic = "force-dynamic";

const ICONO: Record<EstadoPermiso, string> = { yes: "✓", no: "—", partial: "◐" };

export default async function TeamPage() {
  const ctx = await requirePanelContext();
  const puedeGestionar = puedeCapacidad(ctx, "team.manage");
  const miembros = await listarMiembros(ctx.currentTenant.id, ctx.userId);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {puedeGestionar ? (
        <TeamManager miembros={miembros} />
      ) : (
        <div className="table-wrap">
          <div className="tw-head"><h3>Miembros ({miembros.length})</h3></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
              <tbody>
                {miembros.map((m) => (
                  <tr key={m.membershipId}>
                    <td className="td-strong">{m.nombre}</td>
                    <td className="mono">{m.email}</td>
                    <td>{m.rol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="tw-head">
          <div>
            <h3>Permisos por rol</h3>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
              Qué puede hacer cada rol dentro de este destino.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="matrix">
            <thead>
              <tr>
                <th>Permiso</th>
                <th>Propietario</th>
                <th>Admin</th>
                <th>Editor</th>
                <th>Analista</th>
              </tr>
            </thead>
            <tbody>
              {MATRIZ_VISIBLE.map((fila) => (
                <tr key={fila.permiso}>
                  <td className="td-strong">{fila.permiso}</td>
                  {(["owner", "admin", "editor", "analista"] as const).map((rol) => (
                    <td key={rol}>
                      <span className={`perm ${fila[rol]}`}>{ICONO[fila[rol]]}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
