import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para el frontal del kiosko.
// Usa la clave PÚBLICA (publishable): es segura para el navegador porque
// las tablas están protegidas con RLS y solo se puede leer vía get_catalog().
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)."
  );
}

export const supabase = createClient(url, anonKey);
