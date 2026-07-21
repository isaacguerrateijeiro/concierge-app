"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  guardarFuente,
  guardarIntegracion,
  previsualizarFuente,
  ejecutarImportacion,
  ejecutarActualizacionMasiva,
  type FuenteFormState,
  type PreviewResultado,
} from "./actions";
import type { FuenteProveedor } from "@/lib/panel/imports";

const initial: FuenteFormState = {};

export function ImportManager({
  fuentes,
  categorias,
}: {
  fuentes: FuenteProveedor[];
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendingAll, startAll] = useTransition();
  const [msgAll, setMsgAll] = useState<string | null>(null);
  const configuradas = fuentes.filter((f) => f.fuente_url).length;

  function actualizarTodo() {
    setMsgAll(null);
    startAll(async () => {
      const r = await ejecutarActualizacionMasiva();
      if (r.error) {
        setMsgAll(r.error);
      } else {
        const t = r.totales;
        setMsgAll(
          `Actualización completada en ${r.proveedores.length} proveedor(es): ` +
            `${t.creados} creados, ${t.actualizados} actualizados, ${t.errores} con error ` +
            `(detectados ${t.detectados}).`
        );
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        className="table-wrap"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>Actualización masiva del catálogo</div>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
            Re-escanea todas las fuentes configuradas ({configuradas}) y actualiza los productos.
            También se ejecuta cada noche de forma automática.
          </div>
          {msgAll && <div className="ok-note" style={{ marginTop: 10 }}>{msgAll}</div>}
        </div>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          onClick={actualizarTodo}
          disabled={pendingAll || configuradas === 0}
        >
          {pendingAll ? "Actualizando…" : "Actualizar todo"}
        </button>
      </div>
      {fuentes.map((f) => (
        <FuenteCard key={f.id} fuente={f} categorias={categorias} />
      ))}
    </div>
  );
}

function FuenteCard({
  fuente,
  categorias,
}: {
  fuente: FuenteProveedor;
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [state, formAction, saving] = useActionState(guardarFuente, initial);
  const [intgState, intgAction, savingIntg] = useActionState(guardarIntegracion, initial);
  const [avanzado, setAvanzado] = useState(false);
  const [preview, setPreview] = useState<PreviewResultado | null>(null);
  const [pendingPrev, startPrev] = useTransition();
  const [pendingImp, startImp] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const cfg = fuente.fuente_config ?? {};
  const intg = fuente.integracion_config ?? {};
  const [intgTipo, setIntgTipo] = useState<string>(
    (intg.tipo as string) ?? "local"
  );
  const ultima = fuente.ultimaImportacion;

  function previsualizar() {
    setMsg(null);
    startPrev(async () => {
      const r = await previsualizarFuente(fuente.id);
      setPreview(r);
    });
  }

  function importar() {
    setMsg(null);
    startImp(async () => {
      const r = await ejecutarImportacion(fuente.id);
      if (r.error) {
        setMsg(r.error);
      } else {
        setMsg(
          `Importación ${r.estado}: ${r.creados} creados, ${r.actualizados} actualizados, ${r.errores} con error (detectados ${r.detectados}, vía ${r.metodo}).`
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="table-wrap">
      <div className="tw-head">
        <div>
          <h3>{fuente.nombre}</h3>
          {ultima && (
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2 }}>
              Última importación: {ultima.creados} creados · {ultima.actualizados} act. ·{" "}
              {ultima.errores} err. · {new Date(ultima.created_at).toLocaleString("es-ES")}
            </p>
          )}
        </div>
        <span className={`pill ${fuente.fuente_url ? "live" : "paused"}`}>
          {fuente.fuente_url ? "Fuente configurada" : "Sin fuente"}
        </span>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <form action={formAction}>
          <input type="hidden" name="provider_id" value={fuente.id} />
          {state.error && <div className="err" style={{ marginBottom: 12 }}>{state.error}</div>}
          {state.ok && <div className="ok-note" style={{ marginBottom: 12 }}>Fuente guardada.</div>}

          <div className="field-row">
            <div className="field">
              <label>URL de la fuente</label>
              <input
                className="input"
                name="fuente_url"
                defaultValue={fuente.fuente_url ?? ""}
                placeholder="https://proveedor.com/tours"
              />
            </div>
            <div className="field">
              <label>Categoría destino</label>
              <select
                className="input"
                name="categoria_id"
                defaultValue={(cfg.categoria_id as string) ?? ""}
              >
                <option value="">— Primera categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAvanzado((v) => !v)}
            style={{ marginBottom: avanzado ? 12 : 0 }}
          >
            {avanzado ? "Ocultar selectores CSS" : "Selectores CSS (avanzado)"}
          </button>

          {avanzado && (
            <>
              <div className="fs-desc" style={{ marginBottom: 10 }}>
                Solo si la web no expone datos estructurados. Indica los selectores
                de cada tarjeta y sus campos.
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Tarjeta (item)</label>
                  <input className="input" name="item" defaultValue={(cfg.item as string) ?? ""} placeholder=".product-card" />
                </div>
                <div className="field">
                  <label>Título</label>
                  <input className="input" name="titulo" defaultValue={(cfg.titulo as string) ?? ""} placeholder="h3" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Precio</label>
                  <input className="input" name="precio" defaultValue={(cfg.precio as string) ?? ""} placeholder=".price" />
                </div>
                <div className="field">
                  <label>Imagen</label>
                  <input className="input" name="imagen" defaultValue={(cfg.imagen as string) ?? ""} placeholder="img" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Enlace</label>
                  <input className="input" name="enlace" defaultValue={(cfg.enlace as string) ?? ""} placeholder="a" />
                </div>
                <div className="field">
                  <label>Grupo</label>
                  <input className="input" name="grupo" defaultValue={(cfg.grupo as string) ?? ""} placeholder=".category" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Descripción</label>
                  <input className="input" name="descripcion" defaultValue={(cfg.descripcion as string) ?? ""} placeholder=".card-text" />
                </div>
                <div className="field">
                  <label>Duración</label>
                  <input className="input" name="duracion" defaultValue={(cfg.duracion as string) ?? ""} placeholder=".duration" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Punto de encuentro</label>
                  <input className="input" name="punto_encuentro" defaultValue={(cfg.punto_encuentro as string) ?? ""} placeholder=".meeting-point" />
                </div>
                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26 }}>
                    <input type="checkbox" name="solo_gratuitos" defaultChecked={cfg.solo_gratuitos === true} />
                    Solo importar gratuitos (free tours)
                  </label>
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Guardando…" : "Guardar fuente"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={previsualizar}
              disabled={pendingPrev || !fuente.fuente_url}
            >
              {pendingPrev ? "Analizando…" : "Previsualizar"}
            </button>
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={importar}
              disabled={pendingImp || !fuente.fuente_url}
            >
              {pendingImp ? "Importando…" : "Importar a borradores"}
            </button>
          </div>
        </form>

        {/* Integración de disponibilidad y reserva del proveedor */}
        <form action={intgAction} style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <input type="hidden" name="provider_id" value={fuente.id} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
            Integración de reserva y stock
          </div>
          {intgState.error && <div className="err" style={{ marginBottom: 12 }}>{intgState.error}</div>}
          {intgState.ok && <div className="ok-note" style={{ marginBottom: 12 }}>Integración guardada.</div>}

          <div className="field-row">
            <div className="field">
              <label>Adaptador</label>
              <select
                className="input"
                name="integracion_tipo"
                value={intgTipo}
                onChange={(e) => setIntgTipo(e.target.value)}
              >
                <option value="local">Stock local (interno)</option>
                <option value="bigbus">Big Bus (API externa)</option>
              </select>
            </div>
            <div className="field" />
          </div>

          {intgTipo === "bigbus" && (
            <div className="field-row">
              <div className="field">
                <label>Endpoint API <span className="hint">opcional hasta tener la API</span></label>
                <input
                  className="input"
                  name="integracion_endpoint"
                  defaultValue={(intg.endpoint as string) ?? ""}
                  placeholder="https://api.bigbus.com/v1"
                />
              </div>
              <div className="field">
                <label>Credencial <span className="hint">nombre de variable de entorno</span></label>
                <input
                  className="input"
                  name="integracion_api_key_ref"
                  defaultValue={(intg.api_key_ref as string) ?? ""}
                  placeholder="BIGBUS_API_KEY"
                />
              </div>
            </div>
          )}

          <div className="fs-desc" style={{ marginBottom: 12 }}>
            {intgTipo === "bigbus"
              ? "Con endpoint y credencial se usará la API real de Big Bus para disponibilidad y reserva. Sin ellos, se usa el stock local como red de seguridad."
              : "La disponibilidad y la reserva se gestionan con el stock interno (capacidad por servicio y fecha)."}
          </div>

          <button type="submit" className="btn btn-primary btn-sm" disabled={savingIntg}>
            {savingIntg ? "Guardando…" : "Guardar integración"}
          </button>
        </form>

        {msg && <div className="ok-note" style={{ marginTop: 12 }}>{msg}</div>}

        {preview && (
          <div style={{ marginTop: 14 }}>
            {preview.error ? (
              <div className="err">{preview.error}</div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                  {preview.total} detectados (vía {preview.metodo}). Muestra:
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Precio</th>
                        <th>Grupo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(preview.muestra ?? []).map((m, i) => (
                        <tr key={i}>
                          <td className="td-strong">{m.titulo}</td>
                          <td className="mono">{m.precio !== null ? `${m.precio} €` : "—"}</td>
                          <td>{m.grupo ?? "—"}</td>
                        </tr>
                      ))}
                      {(preview.muestra ?? []).length === 0 && (
                        <tr>
                          <td colSpan={3}>
                            <div className="empty-note">
                              Sin elementos. {(preview.notas ?? []).join(" ")}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
