import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext, puedeCapacidad } from "@/lib/auth/context";
import { listarClientes } from "@/lib/panel/customers";
import { normalizarRango, ventanaPara } from "@/lib/panel/rangos";
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
  // La exportacion expone PII: requiere capacidad explicita.
  if (!puedeCapacidad(ctx, "customers.export")) {
    return NextResponse.json({ error: "sin permiso" }, { status: 403 });
  }

  const rango = normalizarRango(request.nextUrl.searchParams.get("range") ?? undefined);
  const v = ventanaPara(rango);
  const c = await listarClientes(ctx.currentTenant.id, v.desde, v.hasta);

  const cabecera = ["Contacto", "Canal", "Pedidos", "Gasto", "Ultimo"];
  const lineas = [cabecera.join(",")];
  for (const ct of c.contactos) {
    lineas.push(
      [
        csvCampo(ct.destino),
        csvCampo(ct.canal),
        String(ct.pedidos),
        ct.gasto.toFixed(2),
        csvCampo(fmtFechaHora(ct.ultima)),
      ].join(",")
    );
  }

  const csv = "\uFEFF" + lineas.join("\r\n");
  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${ctx.currentTenant.slug}-${fecha}.csv"`,
    },
  });
}
