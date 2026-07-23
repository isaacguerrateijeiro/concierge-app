"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  alternarVisibilidadServicio,
  cambiarEstadoServicio,
  eliminarServicio,
} from "./actions";

export function PublishToggle({
  id,
  estado,
}: {
  id: string;
  estado: "borrador" | "publicado" | "despublicado";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const publicado = estado === "publicado";
  return (
    <button
      type="button"
      className="mini-btn"
      disabled={pending}
      title={publicado ? "Despublicar" : "Publicar"}
      onClick={() =>
        start(async () => {
          await cambiarEstadoServicio(id, publicado ? "despublicado" : "publicado");
          router.refresh();
        })
      }
    >
      {publicado ? "↓" : "↑"}
    </button>
  );
}

export function VisibilityToggle({ id, activo }: { id: string; activo: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className={`toggle ${activo ? "on" : ""}`}
      disabled={pending}
      title={activo ? "Visible" : "Oculto"}
      onClick={() =>
        start(async () => {
          await alternarVisibilidadServicio(id, !activo);
          router.refresh();
        })
      }
    />
  );
}

export function ServiceRowActions({ id, nombre }: { id: string; nombre: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="row-actions">
      <Link className="mini-btn" href={`/panel/products/${id}`} title="Editar">
        ✎
      </Link>
      <button
        type="button"
        className="mini-btn"
        title="Eliminar"
        disabled={pending}
        onClick={() => {
          if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
          start(async () => {
            await eliminarServicio(id);
            router.refresh();
          });
        }}
      >
        🗑
      </button>
    </div>
  );
}
