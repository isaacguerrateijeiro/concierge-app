"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { listarClientes } from "@/lib/panel/customers";
import { leerConfigEntrega, type Remitente } from "@/lib/delivery/config";
import { enviarTwilio } from "@/lib/delivery/twilio";
import { ventanaPara } from "@/lib/panel/rangos";

export interface FormState {
  ok?: boolean;
  error?: string;
  aviso?: string;
}

const canalSchema = z.enum(["email", "sms", "whatsapp"]);
const segmentoSchema = z.enum(["todos", "recurrentes", "nuevos"]);

const crearSchema = z.object({
  nombre: z.string().min(1, "Pon un nombre").max(120),
  canal: canalSchema,
  segmento: segmentoSchema,
  asunto: z.string().max(160).optional(),
  mensaje: z.string().min(1, "Escribe el mensaje").max(2000),
});

export async function crearCampana(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "campaigns.send");

  const parsed = crearSchema.safeParse({
    nombre: formData.get("nombre"),
    canal: formData.get("canal"),
    segmento: formData.get("segmento"),
    asunto: formData.get("asunto") ?? undefined,
    mensaje: formData.get("mensaje"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.canal === "email" && !d.asunto?.trim()) {
    return { error: "El email necesita un asunto." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("campaigns").insert({
    tenant_id: ctx.currentTenant.id,
    nombre: d.nombre,
    canal: d.canal,
    segmento: d.segmento,
    asunto: d.asunto ?? null,
    mensaje: d.mensaje,
    created_by: ctx.userId,
  });
  if (error) return { error: `No se pudo crear: ${error.message}` };

  revalidatePath("/panel/campaigns");
  return { ok: true };
}

export async function eliminarCampana(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "campaigns.send");
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };
  revalidatePath("/panel/campaigns");
  return { ok: true };
}

// Envia un email puntual via Resend (texto plano envuelto en HTML mínimo).
async function enviarEmail(
  remitente: Remitente,
  to: string,
  asunto: string,
  mensaje: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !remitente.email_from) return false;
  const from = remitente.email_nombre
    ? `${remitente.email_nombre} <${remitente.email_from}>`
    : remitente.email_from;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: asunto,
        text: mensaje,
        html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${mensaje.replace(/</g, "&lt;")}</div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function enviarUno(
  canal: "email" | "sms" | "whatsapp",
  remitente: Remitente,
  destino: string,
  asunto: string | null,
  mensaje: string
): Promise<boolean> {
  if (canal === "email") {
    return enviarEmail(remitente, destino, asunto ?? "", mensaje);
  }
  if (canal === "sms") {
    if (!remitente.sms_from) return false;
    const r = await enviarTwilio(remitente.sms_from, destino, mensaje);
    return r.ok;
  }
  // whatsapp
  if (!remitente.whatsapp_from) return false;
  const r = await enviarTwilio(`whatsapp:${remitente.whatsapp_from}`, `whatsapp:${destino}`, mensaje);
  return r.ok;
}

export async function enviarPrueba(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "campaigns.send");

  const parsed = z
    .object({ canal: canalSchema, destino: z.string().min(3), asunto: z.string().optional(), mensaje: z.string().min(1) })
    .safeParse({
      canal: formData.get("canal"),
      destino: String(formData.get("destino") ?? "").trim(),
      asunto: formData.get("asunto") ?? undefined,
      mensaje: formData.get("mensaje"),
    });
  if (!parsed.success) return { error: "Revisa el destino y el mensaje de prueba." };

  const remitente = (await leerConfigEntrega(ctx.currentTenant.id)).remitente;
  const ok = await enviarUno(parsed.data.canal, remitente, parsed.data.destino, parsed.data.asunto ?? null, parsed.data.mensaje);
  return ok
    ? { ok: true, aviso: `Prueba enviada a ${parsed.data.destino}.` }
    : { error: "No se pudo enviar la prueba. Revisa la configuración del canal." };
}

export async function enviarCampana(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "campaigns.send");

  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id)
    .maybeSingle();
  if (!c) return { error: "Campaña no encontrada." };
  if (c.estado === "enviada") return { error: "La campaña ya fue enviada." };

  // Audiencia: contactos del último año por el canal de la campaña y segmento.
  const v = ventanaPara("90d");
  const desde = new Date(Date.now() - 365 * 86400000);
  const clientes = await listarClientes(ctx.currentTenant.id, desde, v.hasta);
  let contactos = clientes.contactos.filter((x) => x.canal === c.canal);
  if (c.segmento === "recurrentes") contactos = contactos.filter((x) => x.pedidos > 1);
  else if (c.segmento === "nuevos") contactos = contactos.filter((x) => x.pedidos === 1);

  const remitente = (await leerConfigEntrega(ctx.currentTenant.id)).remitente;
  let enviados = 0;
  let fallidos = 0;
  for (const ct of contactos) {
    const ok = await enviarUno(c.canal as "email" | "sms" | "whatsapp", remitente, ct.destino, c.asunto, c.mensaje);
    if (ok) enviados++;
    else fallidos++;
  }

  const { error: updErr } = await supabase
    .from("campaigns")
    .update({
      estado: "enviada",
      audiencia: contactos.length,
      enviados,
      fallidos,
      enviada_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (updErr) return { error: `Enviada pero no se pudieron guardar las estadísticas: ${updErr.message}` };

  revalidatePath("/panel/campaigns");
  return {
    ok: true,
    aviso: contactos.length === 0
      ? "No hay contactos en este segmento todavía. La campaña se marcó como enviada (0 destinatarios)."
      : `Campaña enviada: ${enviados} entregados, ${fallidos} fallidos.`,
  };
}
