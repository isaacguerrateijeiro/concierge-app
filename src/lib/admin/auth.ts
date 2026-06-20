import "server-only";
import { cookies } from "next/headers";

// Puente de administración TEMPORAL (hasta el panel con login real de Fase 3b).
// Protege la zona /admin y sus server actions con un token de un solo valor
// guardado en ADMIN_SETUP_TOKEN (variable de entorno, nunca en código).
// El token válido se guarda en una cookie httpOnly tras introducirlo.

export const ADMIN_COOKIE = "cos_admin";

function tokenConfigurado(): string | null {
  const t = process.env.ADMIN_SETUP_TOKEN;
  return t && t.length > 0 ? t : null;
}

// Comprueba si el token recibido coincide con el configurado.
export function tokenValido(token: string | undefined | null): boolean {
  const esperado = tokenConfigurado();
  return !!esperado && token === esperado;
}

// ¿La petición actual viene de un admin autenticado (cookie válida)?
export async function esAdmin(): Promise<boolean> {
  const store = await cookies();
  return tokenValido(store.get(ADMIN_COOKIE)?.value);
}

// Lanza si la petición no es de un admin. Úsalo al principio de cada acción.
export async function requireAdmin(): Promise<void> {
  if (!(await esAdmin())) {
    throw new Error("No autorizado.");
  }
}
