"use client";

import { useActionState, useState } from "react";
import { guardarBranding, type FormState } from "./actions";
import type { TenantConfig } from "@/lib/panel/tenant";

const initial: FormState = {};

const ACCENTES = ["#F2C200", "#0033A0", "#B6321F", "#1F7A3A", "#7A1E2E", "#16140F"];
const SERIFS = ["DM Serif Display", "Georgia", "Times New Roman"];
const SANS = ["Inter", "system-ui", "Helvetica", "Arial"];

export function BrandingEditor({ tenant }: { tenant: TenantConfig }) {
  const [state, formAction, pending] = useActionState(guardarBranding, initial);

  const [nombre, setNombre] = useState(tenant.nombre);
  const [accent, setAccent] = useState(tenant.branding.colors?.accent ?? "#F2C200");
  const [ink, setInk] = useState(tenant.branding.colors?.ink ?? "#16140F");
  const [bone, setBone] = useState(tenant.branding.colors?.bone ?? "#F4F1EA");
  const [mark, setMark] = useState(tenant.branding.mark ?? tenant.nombre.charAt(0));
  const [serif, setSerif] = useState(tenant.branding.fonts?.serif ?? "DM Serif Display");
  const [sans, setSans] = useState(tenant.branding.fonts?.sans ?? "Inter");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
      <form action={formAction} className="panel">
        {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}
        {state.ok && (
          <div className="ok-note" style={{ marginBottom: 14 }}>
            Cambios publicados. El kiosko los aplicará en breve.
          </div>
        )}

        <div className="form-section">
          <div className="fs-title">Marca</div>
          <div className="fs-desc">Identidad que verá el usuario en el kiosko.</div>
          <div className="field-row">
            <div className="field">
              <label>Nombre del destino</label>
              <input className="input" name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="field">
              <label>Inicial / marca <span className="hint">1-2 caracteres</span></label>
              <input className="input" name="mark" value={mark} maxLength={3} onChange={(e) => setMark(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="fs-title">Color</div>
          <div className="field">
            <label>Acento <span className="hint">botones y destacados</span></label>
            <input type="hidden" name="accent" value={accent} />
            <div className="swatches">
              {ACCENTES.map((c) => (
                <div
                  key={c}
                  className={`swatch ${accent.toLowerCase() === c.toLowerCase() ? "on" : ""}`}
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                />
              ))}
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                style={{ width: 46, height: 46, borderRadius: 11, border: "none", background: "none", cursor: "pointer" }}
                title="Color personalizado"
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Tinta (texto)</label>
              <input type="color" name="ink" value={ink} onChange={(e) => setInk(e.target.value)} className="input" style={{ height: 44, padding: 4 }} />
            </div>
            <div className="field">
              <label>Fondo (hueso)</label>
              <input type="color" name="bone" value={bone} onChange={(e) => setBone(e.target.value)} className="input" style={{ height: 44, padding: 4 }} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="fs-title">Tipografía</div>
          <div className="fs-desc">Se aplican en el kiosko si están disponibles en el dispositivo.</div>
          <div className="field-row">
            <div className="field">
              <label>Titulares (serif)</label>
              <select className="input" name="serif" value={serif} onChange={(e) => setSerif(e.target.value)}>
                {SERIFS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cuerpo (sans)</label>
              <select className="input" name="sans" value={sans} onChange={(e) => setSans(e.target.value)}>
                {SANS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Publicando…" : "Publicar cambios"}
        </button>
      </form>

      {/* Vista previa en vivo */}
      <div className="preview-card panel" style={{ alignSelf: "start" }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", marginBottom: 12 }}>
          Vista previa en vivo
        </div>
        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "6px solid var(--ink)",
            aspectRatio: "9/16",
            background: bone,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", justifyContent: "flex-end", background: `linear-gradient(160deg, ${ink} 0%, ${accent}33 100%)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "auto" }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: accent, color: ink, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13 }}>
                {(mark || nombre.charAt(0)).toUpperCase()}
              </span>
              <span style={{ color: bone, fontFamily: `"${sans}", system-ui`, fontSize: 11, fontWeight: 600 }}>
                {nombre}
              </span>
            </div>
            <div style={{ color: "#fff", fontFamily: `"${serif}", Georgia, serif`, fontSize: 30, lineHeight: 1, marginBottom: 12 }}>
              {nombre},<br /><em>a tu manera.</em>
            </div>
            <div style={{ display: "inline-block", width: "fit-content", padding: "9px 16px", borderRadius: 99, fontWeight: 700, fontSize: 12, background: accent, color: ink, fontFamily: `"${sans}", system-ui` }}>
              Empezar →
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.4 }}>
          Los cambios se ven aquí al instante y se publican al kiosko al guardar.
        </p>
      </div>
    </div>
  );
}
