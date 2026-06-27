"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  eliminarCategoria,
  alternarVisibilidadCategoria,
  moverCategoria,
} from "./actions";

export function CategoryCardActions({
  id,
  nombre,
  activo,
  esPrimera,
  esUltima,
}: {
  id: string;
  nombre: string;
  activo: boolean;
  esPrimera: boolean;
  esUltima: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function correr(fn: () => Promise<void>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12 }}>
      <button
        type="button"
        className="mini-btn"
        disabled={pending || esPrimera}
        title="Subir"
        onClick={() => correr(() => moverCategoria(id, "up"))}
      >
        ↑
      </button>
      <button
        type="button"
        className="mini-btn"
        disabled={pending || esUltima}
        title="Bajar"
        onClick={() => correr(() => moverCategoria(id, "down"))}
      >
        ↓
      </button>
      <Link className="mini-btn" href={`/panel/categories/${id}`} title="Editar">
        ✎
      </Link>
      <button
        type="button"
        className={`toggle ${activo ? "on" : ""}`}
        disabled={pending}
        title={activo ? "Visible" : "Oculto"}
        onClick={() => correr(() => alternarVisibilidadCategoria(id, !activo))}
      />
      <div style={{ flex: 1 }} />
      <button
        type="button"
        className="mini-btn"
        disabled={pending}
        title="Eliminar"
        onClick={() => {
          if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return;
          correr(() => eliminarCategoria(id));
        }}
      >
        🗑
      </button>
    </div>
  );
}
