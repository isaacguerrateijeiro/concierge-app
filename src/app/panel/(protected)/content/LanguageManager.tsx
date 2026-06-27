"use client";

import { useActionState } from "react";
import { anadirIdioma, eliminarIdioma, type FormState } from "./actions";

const initial: FormState = {};

const NOMBRE_IDIOMA: Record<string, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

function nombreIdioma(code: string) {
  return NOMBRE_IDIOMA[code] ?? code.toUpperCase();
}

export function LanguageManager({
  locales,
  localeDefault,
}: {
  locales: string[];
  localeDefault: string;
}) {
  const [addState, addAction, adding] = useActionState(anadirIdioma, initial);
  const [delState, delAction, deleting] = useActionState(eliminarIdioma, initial);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Idiomas</h3>
          <p>El idioma principal no se puede eliminar. Al añadir uno, se copia el principal como base.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {locales.map((l) => (
          <span
            key={l}
            className="pill"
            style={{ background: "var(--bone-2)", color: "var(--ink)", gap: 8 }}
          >
            {nombreIdioma(l)}
            {l === localeDefault ? (
              <em style={{ fontSize: 10, color: "var(--muted)" }}>principal</em>
            ) : (
              <form action={delAction} style={{ display: "inline" }}>
                <input type="hidden" name="locale" value={l} />
                <button
                  type="submit"
                  disabled={deleting}
                  title={`Eliminar ${nombreIdioma(l)}`}
                  style={{ border: "none", background: "none", color: "var(--danger)", fontWeight: 700, lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </form>
            )}
          </span>
        ))}
      </div>

      {(addState.error || delState.error) && (
        <div className="err" style={{ marginBottom: 12 }}>
          {addState.error ?? delState.error}
        </div>
      )}

      <form action={addAction} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div className="field" style={{ marginBottom: 0, maxWidth: 200 }}>
          <label>Añadir idioma <span className="hint">código ISO (fr, pt-BR)</span></label>
          <input className="input" name="locale" placeholder="fr" required />
        </div>
        <button type="submit" className="btn btn-ghost" disabled={adding}>
          {adding ? "Añadiendo…" : "Añadir"}
        </button>
      </form>
    </div>
  );
}
