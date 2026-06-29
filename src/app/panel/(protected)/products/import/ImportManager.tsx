"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  guardarFuente,
  previsualizarFuente,
  ejecutarImportacion,
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
  return (
    <div style={{ display: "grid", gap: 16 }}>
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
  const [avanzado, setAvanzado] = useState(false);
  const [preview, setPreview] = useState<PreviewResultado | null>(null);
  const [pendingPrev, startPrev] = useTransition();
  const [pendingImp, startImp] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const cfg = fuente.fuente_config ?? {};
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
