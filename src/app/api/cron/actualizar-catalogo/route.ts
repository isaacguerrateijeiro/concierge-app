import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { catalogCacheTag } from "@/lib/catalog";
import { actualizarTodosLosTenants } from "@/lib/import/batch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

    // Invalidar caché del kiosko por tenant (mismo efecto que Importar / Actualizar todo).
    const admin = createSupabaseAdminClient();
    const tenantIds = resultados.map((r) => r.tenantId);
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin
        .from("tenants")
        .select("id, slug")
        .in("id", tenantIds);
      for (const t of tenants ?? []) {
        revalidateTag(catalogCacheTag(t.slug), "max");
      }
    }

    const totales = resultados.reduce(
      (acc, r) => ({
        detectados: acc.detectados + r.totales.detectados,
        creados: acc.creados + r.totales.creados,
        actualizados: acc.actualizados + r.totales.actualizados,
        despublicados: acc.despublicados + r.totales.despublicados,
        errores: acc.errores + r.totales.errores,
      }),
      { detectados: 0, creados: 0, actualizados: 0, despublicados: 0, errores: 0 }
    );

    // Resumen por proveedor para auditar importadores específicos (bigbus/freetour).
    const proveedores = resultados.flatMap((r) =>
      r.proveedores.map((p) => ({
        tenantId: r.tenantId,
        nombre: p.nombre,
        ok: p.ok,
        metodo: p.metodo ?? null,
        detectados: p.detectados ?? 0,
        actualizados: p.actualizados ?? 0,
        creados: p.creados ?? 0,
        despublicados: p.despublicados ?? 0,
        errores: p.errores ?? 0,
        error: p.error ?? null,
      }))
    );

    return NextResponse.json({
      ok: true,
      tenants: resultados.length,
      totales,
      proveedores,
    });
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
