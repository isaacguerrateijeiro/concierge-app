// Tracker de eventos del kiosko (cliente). Envia a /api/track de forma
// best-effort: nunca debe bloquear ni romper la experiencia del usuario.

export type EventoKiosko =
  | "session_start"
  | "attract_shown"
  | "screen_view"
  | "add_to_cart"
  | "view_cart"
  | "checkout_start"
  | "payment_success"
  | "delivery_sent";

export interface TrackArgs {
  tenantSlug: string;
  sessionId: string;
  tipo: EventoKiosko;
  locale?: string;
  payload?: Record<string, unknown>;
}

export function trackEvent({ tenantSlug, sessionId, tipo, locale, payload }: TrackArgs): void {
  try {
    const body = JSON.stringify({ tenantSlug, sessionId, tipo, locale, payload });
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Silencioso: la analitica nunca interrumpe el kiosko.
  }
}
