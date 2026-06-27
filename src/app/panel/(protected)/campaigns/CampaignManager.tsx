"use client";

import { useActionState, useState } from "react";
import {
  crearCampana,
  enviarCampana,
  eliminarCampana,
  enviarPrueba,
  type FormState,
} from "./actions";
import type { Campana } from "@/lib/panel/campaigns";
import { fmtFechaHora } from "@/lib/panel/format";

const initial: FormState = {};

const CANAL_LABEL: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
const SEG_LABEL: Record<string, string> = { todos: "Todos", recurrentes: "Recurrentes", nuevos: "Nuevos" };

function CampaignRow({ c }: { c: Campana }) {
  const [envState, envAction, envPending] = useActionState(enviarCampana, initial);
  const [delState, delAction, delPending] = useActionState(eliminarCampana, initial);

  return (
    <tr>
      <td className="td-strong">{c.nombre}</td>
      <td>{CANAL_LABEL[c.canal]}</td>
      <td><span className="badge-soft">{SEG_LABEL[c.segmento]}</span></td>
      <td>
        {c.estado === "enviada" ? <span className="pill live">Enviada</span> : <span className="pill draft">Borrador</span>}
      </td>
      <td className="mono">{c.estado === "enviada" ? `${c.enviados}/${c.audiencia}` : "—"}</td>
      <td style={{ color: "var(--muted)", fontSize: 12.5 }}>
        {c.enviadaAt ? fmtFechaHora(c.enviadaAt) : fmtFechaHora(c.createdAt)}
      </td>
      <td>
        <div className="row-actions">
          {c.estado === "borrador" && (
            <form action={envAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="btn btn-accent" disabled={envPending} style={{ padding: "6px 12px" }}>
                {envPending ? "Enviando…" : "Enviar"}
              </button>
            </form>
          )}
          <form action={delAction}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="mini-btn" disabled={delPending} title="Eliminar" style={{ color: "var(--danger)" }}>×</button>
          </form>
        </div>
        {(envState.error || delState.error) && (
          <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>{envState.error ?? delState.error}</div>
        )}
        {envState.aviso && <div style={{ color: "var(--success)", fontSize: 11, marginTop: 4 }}>{envState.aviso}</div>}
      </td>
    </tr>
  );
}

export function CampaignManager({ campanas }: { campanas: Campana[] }) {
  const [crear, crearAction, crearPending] = useActionState(crearCampana, initial);
  const [prueba, pruebaAction, pruebaPending] = useActionState(enviarPrueba, initial);

  const [canal, setCanal] = useState<"email" | "sms" | "whatsapp">("email");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [destino, setDestino] = useState("");

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div className="campaign-box">
        <div className="cb-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--ink)" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <div className="cb-text">
          <h3>Reactiva a tus clientes</h3>
          <p>Crea una campaña por email, SMS o WhatsApp dirigida a los contactos que captaste en los kioskos. Respeta siempre el consentimiento del cliente.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h3>Nueva campaña</h3></div></div>
        {crear.error && <div className="err" style={{ marginBottom: 12 }}>{crear.error}</div>}
        {crear.ok && <div className="ok-note" style={{ marginBottom: 12 }}>Campaña creada como borrador.</div>}

        <form action={crearAction}>
          <div className="field-row">
            <div className="field">
              <label>Nombre</label>
              <input className="input" name="nombre" placeholder="Vuelve este finde" required />
            </div>
            <div className="field">
              <label>Canal</label>
              <select className="input" name="canal" value={canal} onChange={(e) => setCanal(e.target.value as typeof canal)}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Segmento</label>
              <select className="input" name="segmento" defaultValue="todos">
                <option value="todos">Todos los contactos</option>
                <option value="recurrentes">Recurrentes (&gt;1 pedido)</option>
                <option value="nuevos">Nuevos (1 pedido)</option>
              </select>
            </div>
            {canal === "email" && (
              <div className="field">
                <label>Asunto</label>
                <input className="input" name="asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Una sorpresa te espera" />
              </div>
            )}
          </div>
          <div className="field">
            <label>Mensaje</label>
            <textarea className="input" name="mensaje" rows={4} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe tu mensaje…" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={crearPending}>
            {crearPending ? "Creando…" : "Crear borrador"}
          </button>
        </form>

        <div style={{ borderTop: "1px solid var(--line)", marginTop: 22, paddingTop: 18 }}>
          <div className="fs-title" style={{ fontSize: 15 }}>Enviar prueba</div>
          <div className="fs-desc">Envía el mensaje de arriba a un único destino para revisarlo antes de lanzar.</div>
          {prueba.error && <div className="err" style={{ marginBottom: 12 }}>{prueba.error}</div>}
          {prueba.ok && <div className="ok-note" style={{ marginBottom: 12 }}>{prueba.aviso}</div>}
          <form action={pruebaAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <input type="hidden" name="canal" value={canal} />
            <input type="hidden" name="asunto" value={asunto} />
            <input type="hidden" name="mensaje" value={mensaje} />
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label>{canal === "email" ? "Email de prueba" : "Teléfono de prueba (+34…)"}</label>
              <input className="input" name="destino" value={destino} onChange={(e) => setDestino(e.target.value)} placeholder={canal === "email" ? "tu@correo.com" : "+34600000000"} required />
            </div>
            <button type="submit" className="btn btn-ghost" disabled={pruebaPending}>
              {pruebaPending ? "Enviando…" : "Enviar prueba"}
            </button>
          </form>
        </div>
      </div>

      <div className="table-wrap">
        <div className="tw-head"><h3>Campañas ({campanas.length})</h3></div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Canal</th><th>Segmento</th><th>Estado</th><th>Enviados</th><th>Fecha</th><th></th>
              </tr>
            </thead>
            <tbody>
              {campanas.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-note">Aún no hay campañas. Crea la primera arriba.</div></td></tr>
              ) : (
                campanas.map((c) => <CampaignRow key={c.id} c={c} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
