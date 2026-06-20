"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  iniciarOnboardingProveedor,
  sincronizarEstadoProveedor,
} from "@/lib/payments/connect";
import { cerrarSesionAdmin } from "./actions";

export interface ProviderRow {
  id: string;
  nombre: string;
  slug: string;
  stripe_account_id: string | null;
  stripe_payouts_activos: boolean;
  stripe_onboarding_estado: string | null;
  tenantSlug: string;
}

export default function AdminConnect({ providers }: { providers: ProviderRow[] }) {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px", fontFamily: "Inter, system-ui, sans-serif", color: "#16140F" }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>Administración · Connect</h1>
        <form action={cerrarSesionAdmin}>
          <button type="submit" style={linkBtn}>Cerrar sesión</button>
        </form>
      </header>
      <p style={{ color: "#6b6657", marginTop: 0, marginBottom: 28, fontSize: 14 }}>
        Puente temporal (modo test). Da de alta a cada proveedor en Stripe Connect
        para que pueda recibir su parte de cada pago.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e6e2d8" }}>
            <th style={th}>Proveedor</th>
            <th style={th}>Tenant</th>
            <th style={th}>Cuenta Stripe</th>
            <th style={th}>Cobros</th>
            <th style={th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <ProviderFila key={p.id} provider={p} />
          ))}
        </tbody>
      </table>
    </main>
  );
}

function ProviderFila({ provider }: { provider: ProviderRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function onboard() {
    setMsg(null);
    try {
      const url = await iniciarOnboardingProveedor(provider.id);
      window.location.href = url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  function sincronizar() {
    setMsg(null);
    startTransition(async () => {
      try {
        await sincronizarEstadoProveedor(provider.id);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #efece4" }}>
      <td style={td}>{provider.nombre}</td>
      <td style={td}>{provider.tenantSlug}</td>
      <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
        {provider.stripe_account_id ?? "—"}
      </td>
      <td style={td}>
        <span style={{ color: provider.stripe_payouts_activos ? "#1a7f37" : "#9a6700", fontWeight: 600 }}>
          {provider.stripe_payouts_activos ? "Activos" : provider.stripe_onboarding_estado ?? "Sin alta"}
        </span>
      </td>
      <td style={td}>
        <button type="button" onClick={onboard} disabled={pending} style={primaryBtn}>
          {provider.stripe_account_id ? "Continuar onboarding" : "Dar de alta"}
        </button>
        {provider.stripe_account_id && (
          <button type="button" onClick={sincronizar} disabled={pending} style={{ ...linkBtn, marginLeft: 10 }}>
            {pending ? "..." : "Sincronizar"}
          </button>
        )}
        {msg && <div style={{ color: "#b42318", fontSize: 12, marginTop: 6 }}>{msg}</div>}
      </td>
    </tr>
  );
}

const th: React.CSSProperties = { padding: "10px 8px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b6657" };
const td: React.CSSProperties = { padding: "14px 8px", verticalAlign: "top" };
const primaryBtn: React.CSSProperties = { background: "#16140F", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 14 };
const linkBtn: React.CSSProperties = { background: "transparent", border: "1px solid #cfcabc", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 14, color: "#16140F" };
