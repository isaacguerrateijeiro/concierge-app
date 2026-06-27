"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cambiarTenant } from "@/app/panel/_actions";
import type { TenantAccesible } from "@/lib/auth/context";

function inicial(nombre: string): string {
  return (nombre.trim()[0] ?? "?").toUpperCase();
}

export function TenantSwitcher({
  tenants,
  current,
  isPlatformAdmin,
}: {
  tenants: TenantAccesible[];
  current: TenantAccesible;
  isPlatformAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const único = tenants.length <= 1;

  function seleccionar(id: string) {
    setOpen(false);
    if (id === current.id) return;
    startTransition(async () => {
      await cambiarTenant(id);
      router.refresh();
    });
  }

  const color =
    (current.branding?.color_acento as string) ||
    (current.branding?.accent as string) ||
    "#1b6fb8";

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="sb-tenant"
        onClick={() => !único && setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sb-tenant-logo" style={{ background: color }}>
          {inicial(current.nombre)}
        </span>
        <span className="sb-tenant-info">
          <b>{current.nombre}</b>
          <small>
            {isPlatformAdmin ? "Kioma · plataforma" : current.rol}
          </small>
        </span>
        {!único && <span className="chev">▾</span>}
      </button>
      {open && (
        <div className="dropdown-menu" role="listbox">
          {tenants.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`dropdown-item${t.id === current.id ? " on" : ""}`}
              onClick={() => seleccionar(t.id)}
              role="option"
              aria-selected={t.id === current.id}
            >
              <span
                className="sb-tenant-logo"
                style={{
                  background:
                    (t.branding?.color_acento as string) || "#1b6fb8",
                  width: 26,
                  height: 26,
                  fontSize: 11,
                }}
              >
                {inicial(t.nombre)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>{t.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
