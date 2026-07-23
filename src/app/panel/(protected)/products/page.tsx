import { requirePanelContext } from "@/lib/auth/context";
import {
  arbolServiciosAnidado,
  listarProveedores,
  listarServicios,
  loc,
  type ServicioNodo,
} from "@/lib/panel/catalog";
import {
  CatalogTree,
  type CatalogNode,
  type CatalogProviderGroup,
} from "./CatalogTree";

export const dynamic = "force-dynamic";

function toCatalogNode(n: ServicioNodo, localeDefault: string): CatalogNode {
  const { children, tiers: _t, availability: _a, ...rest } = n;
  return {
    ...rest,
    titulo: loc(n.titulo_i18n, localeDefault) || n.slug,
    children: children.map((c) => toCatalogNode(c, localeDefault)),
  };
}

function countLeaves(nodes: CatalogNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.tipo_nodo === "servicio") n += 1;
    n += countLeaves(node.children);
  }
  return n;
}

export default async function ProductsPage() {
  const ctx = await requirePanelContext();
  const [servicios, proveedores] = await Promise.all([
    listarServicios(ctx.currentTenant.id),
    listarProveedores(ctx.currentTenant.id),
  ]);
  const localeDefault = "es";
  const roots = arbolServiciosAnidado(servicios).map((n) =>
    toCatalogNode(n, localeDefault)
  );

  const byProvider = new Map<string | null, CatalogNode[]>();
  for (const root of roots) {
    const key = root.provider_id || null;
    const list = byProvider.get(key) ?? [];
    list.push(root);
    byProvider.set(key, list);
  }

  const provById = new Map(proveedores.map((p) => [p.id, p]));
  const groups: CatalogProviderGroup[] = [];

  // Orden: proveedores conocidos (alfabético), luego huérfanos.
  for (const p of proveedores) {
    const rootsProv = byProvider.get(p.id);
    if (!rootsProv?.length) continue;
    groups.push({
      providerId: p.id,
      nombre: p.nombre,
      color: p.color_marca,
      slug: p.slug,
      tieneFuente: p.tieneFuente,
      roots: rootsProv,
      numServicios: countLeaves(rootsProv),
    });
    byProvider.delete(p.id);
  }

  for (const [id, rootsProv] of byProvider) {
    if (!rootsProv.length) continue;
    const p = id ? provById.get(id) : undefined;
    groups.push({
      providerId: id,
      nombre: p?.nombre ?? rootsProv[0]?.proveedorNombre ?? "Sin proveedor",
      color: p?.color_marca ?? rootsProv[0]?.proveedorColor ?? null,
      slug: p?.slug ?? null,
      tieneFuente: p?.tieneFuente ?? false,
      roots: rootsProv,
      numServicios: countLeaves(rootsProv),
    });
  }

  return <CatalogTree groups={groups} providers={proveedores} />;
}
