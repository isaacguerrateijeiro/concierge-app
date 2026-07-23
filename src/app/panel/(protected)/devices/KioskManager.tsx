"use client";

import { useActionState, useState } from "react";
import {
  guardarKiosko,
  alternarKiosko,
  eliminarKiosko,
  type FormState,
} from "./actions";
import type { Kiosko } from "@/lib/panel/devices";
import { fmtFechaHora } from "@/lib/panel/format";

const initial: FormState = {};

const NOMBRE_IDIOMA: Record<string, string> = {
  es: "Español", en: "English", fr: "Français", de: "Deutsch", it: "Italiano", pt: "Português",
};
const nombreIdioma = (c: string) => NOMBRE_IDIOMA[c] ?? c.toUpperCase();

function Row({
  k,
  puedeEditar,
  onEdit,
  ahora,
  appUrl,
}: {
  k: Kiosko;
  puedeEditar: boolean;
  onEdit: (k: Kiosko) => void;
  ahora: number;
  appUrl: string;
}) {
  const [, togAction, togPending] = useActionState(alternarKiosko, initial);
  const [delState, delAction, delPending] = useActionState(eliminarKiosko, initial);
  const [copiado, setCopiado] = useState(false);

  const activoReciente = k.ultimoPedido && ahora - new Date(k.ultimoPedido).getTime() < 86400000;
  const estado = !k.activo ? "offline" : activoReciente ? "online" : "idle";
  const estadoLabel = !k.activo ? "Inactivo" : activoReciente ? "Activo hoy" : "En reposo";
  const urlKiosko = `${appUrl}/?kiosk=${k.id}`;

  async function copiarUrl() {
    try {
      await navigator.clipboard.writeText(urlKiosko);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Fallback: seleccionamos el texto del input oculto no es necesario;
      // el operador puede copiar el ID a mano.
    }
  }

  return (
    <tr>
      <td>
        <div className="td-strong">{k.nombre}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, fontFamily: "var(--mono, monospace)" }}>
          {k.id}
        </div>
        {k.direccionRecogida && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, maxWidth: 260, lineHeight: 1.35 }}>
            {k.direccionRecogida}
          </div>
        )}
      </td>
      <td>{k.tipoI18n.es ?? Object.values(k.tipoI18n)[0] ?? "—"}</td>
      <td>
        <span className="device-status">
          <span className={`ds-dot ${estado}`} /> {estadoLabel}
        </span>
      </td>
      <td className="mono">{k.pedidos}</td>
      <td style={{ color: "var(--muted)", fontSize: 12.5 }}>
        {k.ultimoPedido ? fmtFechaHora(k.ultimoPedido) : "—"}
      </td>
      <td>
        <button
          type="button"
          className={`kiosk-copy-btn ${copiado ? "copied" : ""}`}
          onClick={copiarUrl}
          title={urlKiosko}
        >
          {copiado ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
          <span>{copiado ? "Copiada" : "Copiar URL"}</span>
        </button>
      </td>
      {puedeEditar && (
        <td>
          <div className="row-actions">
            <form action={togAction}>
              <input type="hidden" name="id" value={k.id} />
              <input type="hidden" name="activo" value={String(k.activo)} />
              <button type="submit" className={`toggle ${k.activo ? "on" : ""}`} disabled={togPending} title={k.activo ? "Desactivar" : "Activar"} />
            </form>
            <button className="mini-btn" onClick={() => onEdit(k)} title="Editar">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={k.id} />
              <button type="submit" className="mini-btn" disabled={delPending} title="Eliminar" style={{ color: "var(--danger)" }}>×</button>
            </form>
          </div>
          {delState.error && <div style={{ color: "var(--danger)", fontSize: 11 }}>{delState.error}</div>}
        </td>
      )}
    </tr>
  );
}

export function KioskManager({
  kioskos,
  locales,
  puedeEditar,
  appUrl,
}: {
  kioskos: Kiosko[];
  locales: string[];
  puedeEditar: boolean;
  appUrl: string;
}) {
  const [state, action, pending] = useActionState(guardarKiosko, initial);
  const [editando, setEditando] = useState<Kiosko | null>(null);
  const [abierto, setAbierto] = useState(false);
  // Capturamos "ahora" una sola vez para el cálculo de estado (pureza en render).
  const [ahora] = useState(() => Date.now());

  function abrirNuevo() {
    setEditando(null);
    setAbierto(true);
  }
  function abrirEdicion(k: Kiosko) {
    setEditando(k);
    setAbierto(true);
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.45, maxWidth: 720 }}>
        Cada localización tiene un kiosko con un ID único. En el navegador del
        tótem abre una vez su URL (<code style={{ fontSize: 12 }}>?kiosk=&lt;id&gt;</code>);
        queda guardada en el dispositivo y los pedidos saldrán atribuidos a ese kiosko.
      </p>
      {puedeEditar && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-accent" onClick={abrirNuevo}>+ Nuevo kiosko</button>
        </div>
      )}

      {puedeEditar && abierto && (
        <form action={action} className="panel" key={editando?.id ?? "nuevo"}>
          <div className="panel-head">
            <div><h3>{editando ? "Editar kiosko" : "Nuevo kiosko"}</h3></div>
          </div>
          {state.error && <div className="err" style={{ marginBottom: 12 }}>{state.error}</div>}
          {state.ok && <div className="ok-note" style={{ marginBottom: 12 }}>Guardado.</div>}
          {editando && <input type="hidden" name="id" value={editando.id} />}
          <div className="field-row">
            <div className="field">
              <label>Nombre del kiosko</label>
              <input className="input" name="nombre" defaultValue={editando?.nombre ?? ""} placeholder="Recepción · Hall principal" required />
            </div>
            <div className="field">
              <label>Orden</label>
              <input className="input" type="number" name="orden" defaultValue={editando?.orden ?? 0} min={0} />
            </div>
          </div>
          <div className="field-row">
            {locales.map((l) => (
              <div className="field" key={l}>
                <label>Tipo / descripción ({nombreIdioma(l)})</label>
                <input className="input" name={`tipo_${l}`} defaultValue={editando?.tipoI18n[l] ?? ""} placeholder="Tótem interior" />
              </div>
            ))}
          </div>
          <div className="field">
            <label>Dirección de recogida (Bolt / taxis)</label>
            <input
              className="input"
              name="direccion_recogida"
              defaultValue={editando?.direccionRecogida ?? ""}
              placeholder="Gran Vía 28, 28013 Madrid"
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
              Se usa como punto de recogida fijo en el kiosko. El huésped no puede cambiarla.
            </p>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 16, marginTop: 12 }}>
            <input type="checkbox" name="activo" defaultChecked={editando?.activo ?? true} /> Activo
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar kiosko"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <div className="tw-head"><h3>Kioskos ({kioskos.length})</h3></div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Kiosko</th><th>Tipo</th><th>Estado</th><th>Pedidos</th><th>Última actividad</th>
                <th>Configuración</th>
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {kioskos.length === 0 ? (
                <tr><td colSpan={puedeEditar ? 7 : 6}><div className="empty-note">Aún no hay kioskos. {puedeEditar ? "Crea el primero." : ""}</div></td></tr>
              ) : (
                kioskos.map((k) => (
                  <Row
                    key={k.id}
                    k={k}
                    puedeEditar={puedeEditar}
                    onEdit={abrirEdicion}
                    ahora={ahora}
                    appUrl={appUrl}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
