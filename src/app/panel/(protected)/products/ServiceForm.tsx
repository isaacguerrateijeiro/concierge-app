"use client";

import { useActionState } from "react";
import Link from "next/link";
import { guardarServicio, type FormState } from "./actions";
import type { ProveedorMini, CategoriaPanel, ServicioPanel, I18n } from "@/lib/panel/catalog";

const initial: FormState = {};

const LOCALE_LABEL: Record<string, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
};

export function ServiceForm({
  servicio,
  proveedores,
  categorias,
  locales,
}: {
  servicio: ServicioPanel | null;
  proveedores: ProveedorMini[];
  categorias: CategoriaPanel[];
  locales: string[];
}) {
  const [state, formAction, pending] = useActionState(guardarServicio, initial);
  const t = (servicio?.titulo_i18n ?? {}) as I18n;
  const sub = (servicio?.subtitulo_i18n ?? {}) as I18n;

  return (
    <form action={formAction} className="panel" style={{ maxWidth: 720 }}>
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}

      <div className="form-section">
        <div className="fs-title">{servicio ? "Editar servicio" : "Nuevo servicio"}</div>
        <div className="fs-desc">Los cambios se publican al instante en el kiosko.</div>

        {locales.map((l) => (
          <div className="field-row" key={l}>
            <div className="field">
              <label>
                Título <span className="hint">{LOCALE_LABEL[l] ?? l}</span>
              </label>
              <input
                className="input"
                name={`titulo_${l}`}
                defaultValue={t[l] ?? ""}
                required={l === locales[0]}
              />
            </div>
            <div className="field">
              <label>
                Subtítulo <span className="hint">{LOCALE_LABEL[l] ?? l}</span>
              </label>
              <input className="input" name={`subtitulo_${l}`} defaultValue={sub[l] ?? ""} />
            </div>
          </div>
        ))}

        <div className="field-row">
          <div className="field">
            <label>Slug</label>
            <input
              className="input"
              name="slug"
              defaultValue={servicio?.slug ?? ""}
              placeholder="free-tour-madrid"
              required
            />
          </div>
          <div className="field">
            <label>Icono <span className="hint">emoji opcional</span></label>
            <input className="input" name="icono" defaultValue={servicio?.icono ?? ""} placeholder="🎒" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Proveedor</label>
            <select className="input" name="provider_id" defaultValue={servicio?.provider_id ?? ""} required>
              <option value="" disabled>Selecciona…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Categoría</label>
            <select className="input" name="category_id" defaultValue={servicio?.category_id ?? ""} required>
              <option value="" disabled>Selecciona…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre_i18n[locales[0]] ?? c.slug}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Modelo de pago</label>
            <select className="input" name="tipo_pago" defaultValue={servicio?.tipo_pago ?? "integrado"}>
              <option value="integrado">Integrado (Stripe)</option>
              <option value="derivado">Derivado a tercero</option>
            </select>
          </div>
          <div className="field">
            <label>Orden</label>
            <input className="input" name="orden" type="number" defaultValue={servicio?.orden ?? 0} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Precio desde <span className="hint">€, opcional</span></label>
            <input
              className="input"
              name="precio_desde"
              defaultValue={servicio?.precio_desde ?? ""}
              placeholder="14.00"
            />
          </div>
          <div className="field">
            <label>IVA % <span className="hint">21, 10, 0…</span></label>
            <input
              className="input"
              name="iva_tipo"
              defaultValue={servicio?.iva_tipo ?? ""}
              placeholder="21"
            />
          </div>
        </div>

        <div className="field">
          <label>URL de redirección <span className="hint">solo servicios derivados</span></label>
          <input
            className="input"
            name="url_redireccion"
            defaultValue={servicio?.url_redireccion ?? ""}
            placeholder="https://…"
          />
        </div>

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" name="activo" defaultChecked={servicio?.activo ?? true} />
            Visible en el kiosko
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <Link className="btn btn-ghost" href="/panel/products">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
