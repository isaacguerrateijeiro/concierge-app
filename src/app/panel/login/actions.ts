"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
  next: z.string().optional(),
});

export interface LoginState {
  error?: string;
}

export async function iniciarSesion(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/panel") ? next : "/panel");
}
