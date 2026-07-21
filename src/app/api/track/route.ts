import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Endpoint de instrumentacion del kiosko. Publico (el kiosko es anonimo), pero
// estrechamente validado: solo tipos de evento conocidos y la escritura ocurre
// via la RPC track_kiosk_event (security definer) con la clave de servicio.
const schema = z.object({
  tenantSlug: z.string().min(1).max(80),
  sessionId: z.string().uuid(),
  tipo: z.enum([
    "session_start", "attract_shown", "screen_view", "add_to_cart",
    "view_cart", "checkout_start", "payment_success", "delivery_sent",
  ]),
  locale: z.string().max(10).optional(),
  locationId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = schema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { tenantSlug, sessionId, tipo, locale, locationId, payload } = parsed.data;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.rpc("track_kiosk_event", {
      p_tenant_slug: tenantSlug,
      p_session: sessionId,
      p_tipo: tipo,
      p_locale: locale ?? undefined,
      p_payload: (payload ?? {}) as never,
      p_location_id: locationId ?? undefined,
    });
  } catch {
    // Best-effort: si falla el registro, no penalizamos al kiosko.
  }
  return new NextResponse(null, { status: 204 });
}
