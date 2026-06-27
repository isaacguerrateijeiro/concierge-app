"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  iniciarOnboardingProveedor,
  sincronizarEstadoProveedor,
} from "@/lib/payments/connect";

export default function ConnectActions({
  providerId,
  tieneCuenta,
}: {
  providerId: string;
  tieneCuenta: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function onboard() {
    setMsg(null);
    try {
      const url = await iniciarOnboardingProveedor(providerId);
      window.location.href = url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  function sincronizar() {
    setMsg(null);
    startTransition(async () => {
      try {
        await sincronizarEstadoProveedor(providerId);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={onboard} disabled={pending}>
        {tieneCuenta ? "Continuar onboarding" : "Dar de alta"}
      </button>
      {tieneCuenta && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={sincronizar} disabled={pending}>
          {pending ? "..." : "Sincronizar"}
        </button>
      )}
      {msg && <span className="err" style={{ fontSize: 12 }}>{msg}</span>}
    </div>
  );
}
