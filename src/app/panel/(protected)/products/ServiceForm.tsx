"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { guardarServicio, type FormState } from "./actions";
import type {
  ProveedorMini,
  CategoriaPanel,
  ServicioPanel,
  PriceTierPanel,
  AvailabilityPanel,
  OpcionPadre,
  I18n,
} from "@/lib/panel/catalog";

const initial: FormState = {};

interface TierDraft {
  tipo: string;
  label_es: string;
  label_en: string;
  precio: string;
  orden: number;
}

interface AvailDraft {
  fecha: string;
  capacidad: string;
  reservados: number;
}

function availFromPanel(a: AvailabilityPanel): AvailDraft {
  return { fecha: a.fecha, capacidad: String(a.capacidad), reservados: a.reservados };
}

function tierFromPanel(t: PriceTierPanel): TierDraft {
  return {
    tipo: t.tipo,
    label_es: t.label_i18n["es"] ?? "",
    label_en: t.label_i18n["en"] ?? "",
    precio: t.precio.toFixed(2),
    orden: t.orden,
  };
}

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
  padres,
  locales,
}: {
  servicio: ServicioPanel | null;
  proveedores: ProveedorMini[];
  categorias: CategoriaPanel[];
  padres: OpcionPadre[];
  locales: string[];
}) {
  const [state, formAction, pending] = useActionState(guardarServicio, initial);
  const [tipoNodo, setTipoNodo] = useState<"grupo" | "servicio">(
    servicio?.tipo_nodo ?? "servicio"
  );
  const [tipoPago, setTipoPago] = useState<string>(
    servicio?.tipo_pago ?? "integrado"
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    (servicio?.tiers ?? []).map(tierFromPanel)
  );
  const [capacidadDiaria, setCapacidadDiaria] = useState<string>(
    servicio?.capacidad_diaria != null ? String(servicio.capacidad_diaria) : ""
  );
  const [overrides, setOverrides] = useState<AvailDraft[]>(
    (servicio?.availability ?? []).map(availFromPanel)
  );
  const t = (servicio?.titulo_i18n ?? {}) as I18n;
  const sub = (servicio?.subtitulo_i18n ?? {}) as I18n;
  const desc = (servicio?.descripcion_i18n ?? {}) as I18n;
  const pe = (servicio?.punto_encuentro_i18n ?? {}) as I18n;
  const inst = (servicio?.instrucciones_i18n ?? {}) as I18n;
  const esServicio = tipoNodo === "servicio";
  const esIntegrado = esServicio && tipoPago === "integrado";

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { tipo: "", label_es: "", label_en: "", precio: "", orden: prev.length },
    ]);
  }
  function removeTier(idx: number) {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateTier(idx: number, field: keyof TierDraft, value: string | number) {
    setTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  }

  function addOverride() {
    setOverrides((prev) => [...prev, { fecha: "", capacidad: "", reservados: 0 }]);
  }
  function removeOverride(idx: number) {
    setOverrides((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateOverride(idx: number, field: "fecha" | "capacidad", value: string) {
    setOverrides((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o))
    );
  }

  return (
    <form action={formAction} className="panel" style={{ maxWidth: 720 }}>
      {servicio && <input type="hidden" name="id" value={servicio.id} />}
      {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}

      <div className="form-section">
        <div className="fs-title">{servicio ? "Editar nodo" : "Nuevo nodo de catálogo"}</div>
        <div className="fs-desc">
          Un <strong>grupo</strong> agrupa otros nodos (no se vende). Un{" "}
          <strong>servicio</strong> es una hoja vendible con precio.
        </div>

        <div className="field-row">
          <div className="field">
            <label>Tipo de nodo</label>
            <select
              className="input"
              name="tipo_nodo"
              value={tipoNodo}
              onChange={(e) => setTipoNodo(e.target.value as "grupo" | "servicio")}
            >
              <option value="servicio">Servicio (vendible)</option>
              <option value="grupo">Grupo (agrupador)</option>
            </select>
          </div>
          <div className="field">
            <label>Nodo padre <span className="hint">opcional</span></label>
            <select className="input" name="parent_id" defaultValue={servicio?.parent_id ?? ""}>
              <option value="">— Nivel superior (sin padre)</option>
              {padres.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

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

        {/* Descripción larga + punto de encuentro (por idioma) */}
        {locales.map((l) => (
          <div className="field" key={`desc_${l}`}>
            <label>
              Descripción <span className="hint">{LOCALE_LABEL[l] ?? l}</span>
            </label>
            <textarea
              className="input"
              name={`descripcion_${l}`}
              defaultValue={desc[l] ?? ""}
              rows={3}
              placeholder="Texto largo que se muestra en el detalle del kiosko."
            />
          </div>
        ))}

        {locales.map((l) => (
          <div className="field" key={`pe_${l}`}>
            <label>
              Punto de encuentro <span className="hint">{LOCALE_LABEL[l] ?? l}</span>
            </label>
            <input
              className="input"
              name={`punto_encuentro_${l}`}
              defaultValue={pe[l] ?? ""}
              placeholder="p. ej. Plaza Mayor, Centro"
            />
          </div>
        ))}

        {locales.map((l) => (
          <div className="field" key={`inst_${l}`}>
            <label>
              Cómo usar el billete <span className="hint">{LOCALE_LABEL[l] ?? l}</span>
            </label>
            <textarea
              className="input"
              name={`instrucciones_${l}`}
              defaultValue={inst[l] ?? ""}
              rows={3}
              placeholder="p. ej. Abre la app, añade la reserva, activa el billete y muéstralo al conductor."
            />
          </div>
        ))}

        <div className="field-row">
          <div className="field">
            <label>Slug</label>
            <input
              className="input"
              name="slug"
              defaultValue={servicio?.slug ?? ""}
              placeholder="bus-turistico-madrid"
              required
            />
          </div>
          <div className="field">
            <label>Icono <span className="hint">emoji opcional</span></label>
            <input className="input" name="icono" defaultValue={servicio?.icono ?? ""} placeholder="🚌" />
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
            <label>Estado</label>
            <select className="input" name="estado" defaultValue={servicio?.estado ?? "publicado"}>
              <option value="publicado">Publicado (visible en kiosko)</option>
              <option value="borrador">Borrador (oculto)</option>
            </select>
          </div>
          <div className="field">
            <label>Orden</label>
            <input className="input" name="orden" type="number" defaultValue={servicio?.orden ?? 0} />
          </div>
        </div>

        <div className="field">
          <label>Imagen <span className="hint">URL, opcional</span></label>
          <input
            className="input"
            name="imagen_url"
            defaultValue={servicio?.imagen_url ?? ""}
            placeholder="https://…/foto.jpg"
          />
        </div>

        {esServicio && (
          <>
            <div className="field-row">
              <div className="field">
                <label>Modelo de pago</label>
                <select
                  className="input"
                  name="tipo_pago"
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                >
                  <option value="integrado">Integrado (Stripe)</option>
                  <option value="derivado">Derivado a tercero</option>
                </select>
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

            <div className="field-row">
              <div className="field">
                <label>Precio desde <span className="hint">€, mínimo mostrado en el kiosko</span></label>
                <input
                  className="input"
                  name="precio_desde"
                  defaultValue={servicio?.precio_desde ?? ""}
                  placeholder="14.00"
                />
              </div>
              <div className="field">
                <label>URL de redirección <span className="hint">solo derivados</span></label>
                <input
                  className="input"
                  name="url_redireccion"
                  defaultValue={servicio?.url_redireccion ?? ""}
                  placeholder="https://…"
                />
              </div>
            </div>

            {/* Editor de tarifas por tipo de pasajero (solo integrado) */}
            {esIntegrado && (
              <div className="form-section" style={{ marginTop: 24, padding: "20px 24px", background: "var(--bone-2, #f4f4f0)", borderRadius: 12, border: "1px solid var(--line, #e0e0d8)" }}>
                <div className="fs-title" style={{ marginBottom: 4 }}>Tarifas por tipo de pasajero</div>
                <div className="fs-desc" style={{ marginBottom: 14 }}>
                  Define precios para adultos, niños, seniors… El kiosko mostrará un selector de cantidad por tipo con calendario de fecha.
                </div>
                <input type="hidden" name="tier_count" value={tiers.length} />
                {tiers.map((tier, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <input type="hidden" name={`tier_orden_${i}`} value={i} />
                    <div className="field" style={{ minWidth: 100, flex: "0 0 auto" }}>
                      {i === 0 && <label>Clave</label>}
                      <input
                        className="input"
                        placeholder="adulto"
                        value={tier.tipo}
                        onChange={(e) => updateTier(i, "tipo", e.target.value)}
                        name={`tier_tipo_${i}`}
                        required
                      />
                    </div>
                    <div className="field" style={{ minWidth: 110, flex: "1 1 auto" }}>
                      {i === 0 && <label>Etiqueta ES</label>}
                      <input
                        className="input"
                        placeholder="Adulto"
                        value={tier.label_es}
                        onChange={(e) => updateTier(i, "label_es", e.target.value)}
                        name={`tier_label_es_${i}`}
                      />
                    </div>
                    <div className="field" style={{ minWidth: 110, flex: "1 1 auto" }}>
                      {i === 0 && <label>Etiqueta EN</label>}
                      <input
                        className="input"
                        placeholder="Adult"
                        value={tier.label_en}
                        onChange={(e) => updateTier(i, "label_en", e.target.value)}
                        name={`tier_label_en_${i}`}
                      />
                    </div>
                    <div className="field" style={{ minWidth: 90, flex: "0 0 auto" }}>
                      {i === 0 && <label>Precio €</label>}
                      <input
                        className="input"
                        placeholder="29.70"
                        value={tier.precio}
                        onChange={(e) => updateTier(i, "precio", e.target.value)}
                        name={`tier_precio_${i}`}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="btn btn-ghost btn-sm"
                      style={{ alignSelf: "flex-end", color: "var(--muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addTier} className="btn btn-ghost btn-sm">
                  + Añadir tarifa
                </button>
              </div>
            )}

            {/* Editor de stock / disponibilidad (solo integrado) */}
            {esIntegrado && (
              <div className="form-section" style={{ marginTop: 20, padding: "20px 24px", background: "var(--bone-2, #f4f4f0)", borderRadius: 12, border: "1px solid var(--line, #e0e0d8)" }}>
                <div className="fs-title" style={{ marginBottom: 4 }}>Disponibilidad y stock</div>
                <div className="fs-desc" style={{ marginBottom: 14 }}>
                  Capacidad de plazas por día. El calendario del kiosko marca los días agotados y, al pagar, se descuenta el stock. Déjalo vacío para no limitar plazas.
                </div>

                <div className="field" style={{ maxWidth: 260 }}>
                  <label>Capacidad diaria por defecto <span className="hint">plazas/día</span></label>
                  <input
                    className="input"
                    name="capacidad_diaria"
                    type="number"
                    min={0}
                    value={capacidadDiaria}
                    onChange={(e) => setCapacidadDiaria(e.target.value)}
                    placeholder="p. ej. 50 (vacío = ilimitado)"
                  />
                </div>

                <div className="fs-desc" style={{ margin: "16px 0 10px" }}>
                  Excepciones por fecha <span className="hint">anulan la capacidad diaria ese día</span>
                </div>
                <input type="hidden" name="avail_count" value={overrides.length} />
                {overrides.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div className="field" style={{ minWidth: 160, flex: "0 0 auto" }}>
                      {i === 0 && <label>Fecha</label>}
                      <input
                        className="input"
                        type="date"
                        value={o.fecha}
                        onChange={(e) => updateOverride(i, "fecha", e.target.value)}
                        name={`avail_fecha_${i}`}
                        required
                      />
                    </div>
                    <div className="field" style={{ minWidth: 120, flex: "0 0 auto" }}>
                      {i === 0 && <label>Capacidad</label>}
                      <input
                        className="input"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={o.capacidad}
                        onChange={(e) => updateOverride(i, "capacidad", e.target.value)}
                        name={`avail_capacidad_${i}`}
                        required
                      />
                    </div>
                    {o.reservados > 0 && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--muted)", paddingBottom: 12 }}>
                        {o.reservados} reservadas
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeOverride(i)}
                      className="btn btn-ghost btn-sm"
                      style={{ alignSelf: "flex-end", color: "var(--muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addOverride} className="btn btn-ghost btn-sm">
                  + Añadir fecha
                </button>
              </div>
            )}
          </>
        )}

        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" name="activo" defaultChecked={servicio?.activo ?? true} />
            Activo
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
