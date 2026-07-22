"use client";

import { useActionState, useMemo, useState } from "react";
import {
  guardarComisionesProveedor,
  type FormState,
} from "./actions";
import type { ComisionProveedor } from "@/lib/panel/commissions.types";
import { previewReparto } from "@/lib/payments/commissions";
import { fmtEuro } from "@/lib/panel/format";

const initial: FormState = {};

type Tipo = "porcentaje" | "fijo";

type Draft = {
  tipoCalculo: Tipo;
  plataforma: string;
  operador: string;
};

function valorInicial(c: ComisionProveedor): Draft {
  const tipo =
    c.plataforma?.tipoCalculo ??
    c.operador?.tipoCalculo ??
    "porcentaje";
  const plat =
    c.plataforma?.activo && c.plataforma.valor > 0
      ? String(c.plataforma.valor)
      : "0";
  const op =
    c.operador?.activo && c.operador.valor > 0
      ? String(c.operador.valor)
      : "0";
  return { tipoCalculo: tipo, plataforma: plat, operador: op };
}

function parseNum(v: string): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function CommissionsForm({
  proveedores,
}: {
  proveedores: ComisionProveedor[];
}) {
  const [state, action, pending] = useActionState(guardarComisionesProveedor, initial);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const init: Record<string, Draft> = {};
    for (const p of proveedores) init[p.providerId] = valorInicial(p);
    return init;
  });

  const previews = useMemo(() => {
    const map: Record<string, { plataforma: number; operador: number; proveedor: number }> = {};
    for (const p of proveedores) {
      const d = drafts[p.providerId] ?? valorInicial(p);
      const platVal = parseNum(d.plataforma);
      const opVal = parseNum(d.operador);
      map[p.providerId] = previewReparto({
        plataforma:
          platVal > 0
            ? { tipo_calculo: d.tipoCalculo, valor: platVal }
            : null,
        operador:
          opVal > 0 ? { tipo_calculo: d.tipoCalculo, valor: opVal } : null,
        base: 100,
      });
    }
    return map;
  }, [drafts, proveedores]);

  function setDraft(providerId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [providerId]: { ...(prev[providerId] ?? { tipoCalculo: "porcentaje", plataforma: "0", operador: "0" }), ...patch },
    }));
  }

  if (proveedores.length === 0) {
    return (
      <div className="table-wrap">
        <div className="tw-head"><h3>Comisiones</h3></div>
        <div className="empty-note" style={{ padding: 20 }}>
          Aún no hay proveedores activos. Crea proveedores en el catálogo para configurar el reparto.
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="table-wrap">
      <div className="tw-head">
        <div>
          <h3>Comisiones · reparto a 3 vías</h3>
          <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 2, maxWidth: 720 }}>
            El cliente paga el precio del servicio. Tras el cobro, Stripe transfiere al proveedor
            su parte; plataforma (tú) y operador (Prosegur) retienen el resto en la cuenta de la
            plataforma. Vista previa sobre 100 €.
          </p>
        </div>
      </div>

      {state.error && <div className="err" style={{ margin: "12px 16px 0" }}>{state.error}</div>}
      {state.ok && <div className="ok-note" style={{ margin: "12px 16px 0" }}>Comisiones guardadas. Se aplicarán en los próximos cobros.</div>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Tipo</th>
              <th>Plataforma</th>
              <th>Operador</th>
              <th>Sobre 100 €</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => {
              const d = drafts[p.providerId] ?? valorInicial(p);
              const prev = previews[p.providerId];
              const suf = d.tipoCalculo === "porcentaje" ? "%" : "€";
              return (
                <tr key={p.providerId}>
                  <td className="td-strong">
                    <input type="hidden" name="provider_id" value={p.providerId} />
                    <span
                      className="brand-dot"
                      style={{ background: p.colorMarca ?? "var(--ink-3)" }}
                    />
                    {p.nombre}
                  </td>
                  <td>
                    <select
                      className="input"
                      name={`tipo_${p.providerId}`}
                      value={d.tipoCalculo}
                      onChange={(e) =>
                        setDraft(p.providerId, { tipoCalculo: e.target.value as Tipo })
                      }
                      style={{ minWidth: 110 }}
                    >
                      <option value="porcentaje">%</option>
                      <option value="fijo">Fijo €</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        className="input"
                        name={`plataforma_${p.providerId}`}
                        type="number"
                        min={0}
                        step={d.tipoCalculo === "porcentaje" ? "0.1" : "0.01"}
                        max={d.tipoCalculo === "porcentaje" ? 100 : undefined}
                        value={d.plataforma}
                        onChange={(e) => setDraft(p.providerId, { plataforma: e.target.value })}
                        style={{ width: 88 }}
                      />
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{suf}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        className="input"
                        name={`operador_${p.providerId}`}
                        type="number"
                        min={0}
                        step={d.tipoCalculo === "porcentaje" ? "0.1" : "0.01"}
                        max={d.tipoCalculo === "porcentaje" ? 100 : undefined}
                        value={d.operador}
                        onChange={(e) => setDraft(p.providerId, { operador: e.target.value })}
                        style={{ width: 88 }}
                      />
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{suf}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    <span className="mono">
                      Plat. {fmtEuro(prev.plataforma, true)} · Op. {fmtEuro(prev.operador, true)} · Prov.{" "}
                      {fmtEuro(prev.proveedor, true)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Guardando…" : "Guardar comisiones"}
        </button>
      </div>
    </form>
  );
}
