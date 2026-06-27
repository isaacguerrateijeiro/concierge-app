"use client";

import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "@/app/panel/login/actions";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(iniciarSesion, initial);

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      {state.error && <div className="err">{state.error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
          placeholder="tu@empresa.com"
        />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
        disabled={pending}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
