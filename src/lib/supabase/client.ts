import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";

// Cliente de Supabase para el NAVEGADOR (Client Components). Usa la clave
// pública (publishable), segura en el cliente porque las tablas están
// protegidas con RLS. Útil cuando un componente de cliente necesite hablar
// con Supabase directamente (p. ej. realtime o acciones del usuario).
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
