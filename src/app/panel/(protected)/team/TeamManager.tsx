"use client";

import { useActionState } from "react";
import {
  invitarMiembro,
  cambiarRol,
  eliminarMiembro,
  type FormState,
} from "./actions";
import { ROLES, ROL_LABEL, type Rol } from "@/lib/auth/roles";
import type { Miembro } from "@/lib/panel/team";

const initial: FormState = {};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function MemberRow({ m }: { m: Miembro }) {
  const [rolState, rolAction, rolPending] = useActionState(cambiarRol, initial);
  const [delState, delAction, delPending] = useActionState(eliminarMiembro, initial);

  return (
    <tr>
      <td className="td-strong">
        {m.nombre}
        {m.esYo && <span className="badge-soft" style={{ marginLeft: 8 }}>Tú</span>}
      </td>
      <td className="mono">{m.email}</td>
      <td>
        <form action={rolAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="hidden" name="membershipId" value={m.membershipId} />
          <select
            name="rol"
            className="input"
            defaultValue={m.rol}
            disabled={m.esYo || rolPending}
            style={{ width: "auto", padding: "6px 10px" }}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROL_LABEL[r as Rol]}</option>
            ))}
          </select>
        </form>
      </td>
      <td>{fechaCorta(m.desde)}</td>
      <td>
        {!m.esYo && (
          <form action={delAction}>
            <input type="hidden" name="membershipId" value={m.membershipId} />
            <button type="submit" className="mini-btn" disabled={delPending} title="Quitar del equipo" style={{ color: "var(--danger)" }}>
              ×
            </button>
          </form>
        )}
        {(rolState.error || delState.error) && (
          <span style={{ color: "var(--danger)", fontSize: 11, marginLeft: 6 }}>
            {rolState.error ?? delState.error}
          </span>
        )}
      </td>
    </tr>
  );
}

export function TeamManager({ miembros }: { miembros: Miembro[] }) {
  const [inv, invAction, invPending] = useActionState(invitarMiembro, initial);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Invitar al equipo</h3>
            <p>Se creará el acceso al panel para este destino con el rol elegido.</p>
          </div>
        </div>
        {inv.error && <div className="err" style={{ marginBottom: 12 }}>{inv.error}</div>}
        {inv.ok && (
          <div className="ok-note" style={{ marginBottom: 12 }}>
            {inv.aviso ?? "Miembro añadido."}
          </div>
        )}
        <form action={invAction} style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
            <label>Email</label>
            <input className="input" type="email" name="email" placeholder="persona@empresa.com" required />
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Rol</label>
            <select className="input" name="rol" defaultValue="editor">
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROL_LABEL[r as Rol]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-accent" disabled={invPending}>
            {invPending ? "Invitando…" : "Invitar"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <div className="tw-head">
          <h3>Miembros ({miembros.length})</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {miembros.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-note">Aún no hay miembros. Invita al primero.</div></td></tr>
              ) : (
                miembros.map((m) => <MemberRow key={m.membershipId} m={m} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
