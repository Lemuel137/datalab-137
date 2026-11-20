"use client";

import { useActionState } from "react";
import { entrar, type LoginState } from "./actions";

export function LoginForm({ de }: { de: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(entrar, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="de" value={de} />
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input name="senha" type="password" required autoFocus className="field" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-brand py-2">
        {pending ? "entrando..." : "entrar"}
      </button>
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
    </form>
  );
}
