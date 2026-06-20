import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canalEntregaSchema, localizedSchema } from "@/lib/catalog.schema";

// ============================================================
// Configuración COMPLETA de entrega de un tenant (solo servidor).
// Incluye el remitente (identidades de envío) que NO se expone al kiosko.
// Se valida con Zod al leerla para detectar configuraciones mal formadas.
// ============================================================

export const remitenteSchema = z
  .object({
    email_from: z.string().email().nullable().default(null),
    email_nombre: z.string().nullable().default(null),
    sms_from: z.string().nullable().default(null),
    whatsapp_from: z.string().nullable().default(null),
  })
  .default({
    email_from: null,
    email_nombre: null,
    sms_from: null,
    whatsapp_from: null,
  });

export const entregaConfigSchema = z
  .object({
    canales: z.array(canalEntregaSchema).default([]),
    remitente: remitenteSchema,
    consentimiento: localizedSchema.default({}),
  })
  .default({
    canales: [],
    remitente: {
      email_from: null,
      email_nombre: null,
      sms_from: null,
      whatsapp_from: null,
    },
    consentimiento: {},
  });

export type EntregaConfig = z.infer<typeof entregaConfigSchema>;
export type Remitente = z.infer<typeof remitenteSchema>;

// Lee y valida la config de entrega de un tenant por su id.
export async function leerConfigEntrega(tenantId: string): Promise<EntregaConfig> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("entrega_config")
    .eq("id", tenantId)
    .single();
  if (error || !data) {
    throw new Error(`No se pudo leer la config de entrega: ${error?.message ?? tenantId}`);
  }
  const parsed = entregaConfigSchema.safeParse(data.entrega_config ?? {});
  if (!parsed.success) {
    throw new Error(
      `La config de entrega del tenant ${tenantId} no tiene el formato esperado:\n${z.prettifyError(parsed.error)}`
    );
  }
  return parsed.data;
}
