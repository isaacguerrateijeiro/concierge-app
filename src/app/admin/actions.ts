"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, tokenValido } from "@/lib/admin/auth";

// Inicia sesión en el puente de administración: valida el token y lo guarda en
// una cookie httpOnly. (Puente temporal hasta el panel con login real de 3b.)
export async function iniciarSesionAdmin(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!tokenValido(token)) {
    redirect("/admin?error=1");
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export async function cerrarSesionAdmin() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin");
}
