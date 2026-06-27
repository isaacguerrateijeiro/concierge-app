"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { ICONS } from "@/app/panel/_components/icons";
import { TenantSwitcher } from "@/app/panel/_components/TenantSwitcher";
import { cerrarSesion } from "@/app/panel/_actions";
import type { NavGroup } from "@/app/panel/_components/nav";
import type { TenantAccesible } from "@/lib/auth/context";
import { ROL_LABEL, type Rol } from "@/lib/auth/roles";

function esActivo(pathname: string, href: string): boolean {
  if (href === "/panel") return pathname === "/panel";
  return pathname === href || pathname.startsWith(href + "/");
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Sidebar({
  groups,
  tenants,
  current,
  isPlatformAdmin,
  userNombre,
  userEmail,
}: {
  groups: NavGroup[];
  tenants: TenantAccesible[];
  current: TenantAccesible;
  isPlatformAdmin: boolean;
  userNombre: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const rolLabel = isPlatformAdmin
    ? "Kioma"
    : ROL_LABEL[current.rol as Rol] ?? current.rol;

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">
          <span className="sb-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-6 9 6v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9z"
                fill="#16140F"
              />
            </svg>
          </span>
          <span className="sb-name">
            Concierge<em>OS</em>
          </span>
        </div>
        <div className="sb-tag">Kiosk platform</div>
      </div>

      <TenantSwitcher
        tenants={tenants}
        current={current}
        isPlatformAdmin={isPlatformAdmin}
      />

      <nav className="sb-nav">
        {groups.map((group) => (
          <div className="sb-group" key={group.label}>
            <div className="sb-group-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`nav-item${esActivo(pathname, item.href) ? " active" : ""}`}
              >
                <span className="ic">{ICONS[item.key]}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-user">
        <div className="sb-avatar">{iniciales(userNombre || userEmail)}</div>
        <div className="sb-user-info">
          <b>{userNombre || userEmail}</b>
          <small>{userEmail}</small>
        </div>
        <span className="sb-role">{rolLabel}</span>
        <button
          type="button"
          className="sb-logout"
          title="Cerrar sesión"
          disabled={pending}
          onClick={() => startTransition(() => cerrarSesion())}
        >
          {ICONS.logout}
        </button>
      </div>
    </aside>
  );
}
