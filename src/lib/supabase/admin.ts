import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Cliente de Supabase con la clave de SERVICIO (service_role). SOLO servidor.
// Omite RLS, por lo que puede crear y actualizar pedidos. NUNCA debe usarse en
// el navegador ni exponerse: la clave vive en SUPABASE_SERVICE_ROLE_KEY.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan variables de Supabase para el cliente de servicio. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
