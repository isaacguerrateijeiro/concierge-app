import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Campana {
  id: string;
  nombre: string;
  canal: "email" | "sms" | "whatsapp";
  segmento: "todos" | "recurrentes" | "nuevos";
  asunto: string | null;
  mensaje: string;
  estado: "borrador" | "enviada";
  audiencia: number;
  enviados: number;
  fallidos: number;
  createdAt: string;
  enviadaAt: string | null;
}

export async function listarCampanas(tenantId: string): Promise<Campana[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, nombre, canal, segmento, asunto, mensaje, estado, audiencia, enviados, fallidos, created_at, enviada_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listarCampanas: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    canal: c.canal as Campana["canal"],
    segmento: c.segmento as Campana["segmento"],
    asunto: c.asunto,
    mensaje: c.mensaje,
    estado: c.estado as Campana["estado"],
    audiencia: c.audiencia,
    enviados: c.enviados,
    fallidos: c.fallidos,
    createdAt: c.created_at,
    enviadaAt: c.enviada_at,
  }));
}
