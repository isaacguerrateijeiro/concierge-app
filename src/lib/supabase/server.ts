import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";

// Cliente de Supabase para el SERVIDOR (Server Components, Route Handlers,
// Server Actions). Lee y escribe cookies para gestionar la sesión del usuario,
// patrón necesario para la autenticación del panel de administración (Fase 3).
// Se crea por petición porque depende de las cookies de esa petición.
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan variables de entorno de Supabase. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Llamado desde un Server Component: escribir cookies no está permitido.
          // Es seguro ignorarlo si hay un middleware que refresca la sesión.
        }
      },
    },
  });
}
