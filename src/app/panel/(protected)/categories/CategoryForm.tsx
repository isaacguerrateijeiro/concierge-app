"use client";

import { useActionState } from "react";
import Link from "next/link";
import { guardarCategoria, type FormState } from "./actions";
import type { CategoriaPanel, I18n } from "@/lib/panel/catalog";

const initial: FormState = {};

const LOCALE_LABEL: Record<string, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

export function CategoryForm({
  categoria,
  locales,
}: {
  categoria: CategoriaPanel | null;
  locales: string[];
}) {
  const [state, formAction, pending] = useActionState(guardarCategoria, initial);
  const nombre = (categoria?.nombre_i18n ?? {}) as I18n;
  const sub = (categoria?.subtitulo_i18n ?? {}) as I18n;

  return (
    <form action={formAction} className="panel" style={{ maxWidth: 620 }}>
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}

      <div className="form-section">
        <div className="fs-title">{categoria ? "Editar categoría" : "Nueva categoría"}</div>
        <div className="fs-desc">Las categorías agrupan los servicios en la home del kiosko.</div>

        {locales.map((l) => (
          <div className="field-row" key={l}>
            <div className="field">
              <label>Nombre <span className="hint">{LOCALE_LABEL[l] ?? l}</span></label>
              <input
                className="input"
                name={`nombre_${l}`}
                defaultValue={nombre[l] ?? ""}
                required={l === locales[0]}
              />
            </div>
            <div className="field">
              <label>Subtítulo <span className="hint">{LOCALE_LABEL[l] ?? l}</span></label>
              <input className="input" name={`subtitulo_${l}`} defaultValue={sub[l] ?? ""} />
            </div>
          </div>
        ))}

        <div className="field-row">
          <div className="field">
            <label>Slug</label>
            <input className="input" name="slug" defaultValue={categoria?.slug ?? ""} placeholder="tours" required />
          </div>
          <div className="field">
            <label>Orden</label>
            <input className="input" name="orden" type="number" defaultValue={categoria?.orden ?? 0} />
          </div>
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" name="activo" defaultChecked={categoria?.activo ?? true} />
            Visible en el kiosko
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link className="btn btn-ghost" href="/panel/categories">Cancelar</Link>
      </div>
    </form>
  );
}
