import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

// Cliente de Supabase SIN estado (sin cookies ni sesión), para leer DATOS
// PÚBLICOS del catálogo. Al no depender de cookies, su resultado se puede
// CACHEAR (ver getCatalog en catalog.ts), lo que hace el kiosko rápido y
// resistente a cortes de red. La auth del panel usa el cliente de server.ts.
export function createSupabaseStatelessClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
