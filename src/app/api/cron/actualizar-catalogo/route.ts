import { NextResponse } from "next/server";
import { actualizarTodosLosTenants } from "@/lib/import/batch";

// Endpoint del cron nocturno: re-escanea todas las fuentes de todos los tenants
// y actualiza el catálogo. Protegido con un bearer secreto (CRON_SECRET) para
// que solo lo pueda invocar el job programado (pg_cron/pg_net) o un operador.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function ejecutar(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Falta CRON_SECRET en el entorno." },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const resultados = await actualizarTodosLosTenants();
    const totales = resultados.reduce(
      (acc, r) => ({
        detectados: acc.detectados + r.totales.detectados,
        creados: acc.creados + r.totales.creados,
        actualizados: acc.actualizados + r.totales.actualizados,
        errores: acc.errores + r.totales.errores,
      }),
      { detectados: 0, creados: 0, actualizados: 0, errores: 0 }
    );
    return NextResponse.json({ ok: true, tenants: resultados.length, totales });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en la actualización." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return ejecutar(req);
}

// Permitimos GET también (algunos schedulers solo hacen GET); mismo guard.
export async function GET(req: Request) {
  return ejecutar(req);
}
