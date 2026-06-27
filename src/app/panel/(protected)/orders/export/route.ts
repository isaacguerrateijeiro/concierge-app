import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/auth/context";
import { listarPedidos, resumenItems, type FiltroPedidos } from "@/lib/panel/orders";
import { fmtFechaHora } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

function csvCampo(v: string): string {
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await requirePanelContext();
  } catch {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const estado = (["all", "paid", "pending"].includes(sp.get("estado") ?? "")
    ? sp.get("estado")
    : "all") as FiltroPedidos["estado"];
  const q = sp.get("q") ?? "";

  // Exporta hasta 5000 pedidos del tenant activo.
  const { filas } = await listarPedidos(ctx.currentTenant.id, {
    estado,
    q,
    limite: 5000,
  });

  const cabecera = [
    "Referencia",
    "Fecha",
    "Kiosko",
    "Servicios",
    "Total",
    "Moneda",
    "Estado",
  ];
  const lineas = [cabecera.join(",")];
  for (const o of filas) {
    lineas.push(
      [
        csvCampo(o.referencia ?? ""),
        csvCampo(fmtFechaHora(o.paidAt ?? o.createdAt)),
        csvCampo(o.kiosko ?? ""),
        csvCampo(resumenItems(o.items)),
        o.importeTotal.toFixed(2),
        csvCampo(o.moneda),
        csvCampo(o.estado),
      ].join(",")
    );
  }

  const csv = "\uFEFF" + lineas.join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-${ctx.currentTenant.slug}-${fecha}.csv"`,
    },
  });
}
