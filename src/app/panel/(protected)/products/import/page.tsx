import Link from "next/link";
import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarFuentes } from "@/lib/panel/imports";
import { listarCategorias, getLocalesTenant } from "@/lib/panel/catalog";
import { ImportManager } from "./ImportManager";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const ctx = await requirePanelContext();
  if (!puedeCapacidad(ctx, "catalog.edit")) {
    return <div className="empty-note">No tienes permisos para importar catálogo.</div>;
  }

  const [fuentes, categorias, locales] = await Promise.all([
    listarFuentes(ctx.currentTenant.id),
    listarCategorias(ctx.currentTenant.id),
    getLocalesTenant(ctx.currentTenant.id),
  ]);

  const cats = categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre_i18n[locales[0]] ?? c.slug,
  }));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link className="btn btn-ghost btn-sm" href="/panel/products">
          ← Volver al catálogo
        </Link>
        <div style={{ flex: 1 }} />
      </div>
      <div className="form-section" style={{ maxWidth: 920 }}>
        <div className="fs-title">Importar catálogo desde la web</div>
        <div className="fs-desc">
          Configura la URL de origen de cada proveedor. La importación detecta los
          productos (datos estructurados o selectores), los publica automáticamente
          y despublica los que ya no existen en la fuente.
        </div>
      </div>

      <ImportManager fuentes={fuentes} categorias={cats} />
    </div>
  );
}
