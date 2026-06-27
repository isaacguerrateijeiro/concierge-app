"use client";

import { useActionState } from "react";
import { guardarEntrega, guardarLegal, type FormState } from "./actions";

const initial: FormState = {};

const CANAL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  print: "Impresora",
};

const NOMBRE_IDIOMA: Record<string, string> = {
  es: "Español", en: "English", fr: "Français", de: "Deutsch", it: "Italiano", pt: "Português",
};
const nombreIdioma = (c: string) => NOMBRE_IDIOMA[c] ?? c.toUpperCase();

interface Entrega {
  canales?: string[];
  consentimiento?: Record<string, string>;
  remitente?: Record<string, string>;
}

export function EntregaForm({
  entrega,
  locales,
  remitenteMasked,
}: {
  entrega: Entrega;
  locales: string[];
  remitenteMasked: { label: string; value: string }[];
}) {
  const [state, action, pending] = useActionState(guardarEntrega, initial);
  const activos = new Set(entrega.canales ?? []);

  return (
    <form action={action} className="panel">
      <div className="panel-head">
        <div>
          <h3>Entrega del comprobante</h3>
          <p>Canales por los que el cliente puede recibir su recibo.</p>
        </div>
      </div>

      {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}
      {state.ok && <div className="ok-note" style={{ marginBottom: 14 }}>Guardado.</div>}

      <div className="form-section">
        <div className="fs-title">Canales activos</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {(["email", "sms", "whatsapp", "print"] as const).map((c) => (
            <label
              key={c}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              <input type="checkbox" name={`canal_${c}`} defaultChecked={activos.has(c)} />
              {CANAL_LABEL[c]}
            </label>
          ))}
        </div>
      </div>

      <div className="form-section">
        <div className="fs-title">Texto de consentimiento</div>
        <div className="fs-desc">Aviso que ve el cliente antes de facilitar su contacto.</div>
        {locales.map((l) => (
          <div className="field" key={l}>
            <label>{nombreIdioma(l)}</label>
            <textarea
              className="input"
              name={`consent_${l}`}
              defaultValue={entrega.consentimiento?.[l] ?? ""}
              rows={2}
            />
          </div>
        ))}
      </div>

      <div className="form-section">
        <div className="fs-title">Remitentes</div>
        <div className="fs-desc">Gestionados por la plataforma. Contacta con soporte para cambiarlos.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {remitenteMasked.map((r) => (
            <div key={r.label} style={{ fontSize: 13 }}>
              <div style={{ color: "var(--muted)", fontSize: 11.5, fontWeight: 600 }}>{r.label}</div>
              <div className="mono">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar entrega"}
      </button>
    </form>
  );
}

export function LegalForm({ legal }: { legal: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(guardarLegal, initial);
  const g = (k: string) => (typeof legal[k] === "string" ? (legal[k] as string) : "");

  return (
    <form action={action} className="panel">
      <div className="panel-head">
        <div>
          <h3>Datos legales y fiscales</h3>
          <p>Aparecen en los comprobantes y en la información de soporte.</p>
        </div>
      </div>

      {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}
      {state.ok && <div className="ok-note" style={{ marginBottom: 14 }}>Guardado.</div>}

      <div className="field-row">
        <div className="field">
          <label>Razón social</label>
          <input className="input" name="razon_social" defaultValue={g("razon_social")} />
        </div>
        <div className="field">
          <label>NIF / CIF</label>
          <input className="input" name="nif" defaultValue={g("nif")} />
        </div>
      </div>
      <div className="field">
        <label>Domicilio fiscal</label>
        <input className="input" name="domicilio" defaultValue={g("domicilio")} />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Email de soporte</label>
          <input className="input" type="email" name="soporte_email" defaultValue={g("soporte_email")} />
        </div>
        <div className="field">
          <label>Teléfono de soporte</label>
          <input className="input" name="soporte_telefono" defaultValue={g("soporte_telefono")} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>URL de términos</label>
          <input className="input" name="terminos_url" defaultValue={g("terminos_url")} />
        </div>
        <div className="field">
          <label>URL de privacidad</label>
          <input className="input" name="privacidad_url" defaultValue={g("privacidad_url")} />
        </div>
      </div>
      <div className="field" style={{ maxWidth: 200 }}>
        <label>IVA por defecto (%)</label>
        <input
          className="input"
          type="number"
          name="iva_default"
          min={0}
          max={100}
          defaultValue={typeof legal.iva_default === "number" ? legal.iva_default : ""}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos legales"}
      </button>
    </form>
  );
}
