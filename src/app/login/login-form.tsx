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
        <input name="senha" type="password" required className="border border-zinc-300 p-2" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "entrando..." : "entrar"}
      </button>
      {state && !state.ok && <p className="text-sm text-red-700">{state.message}</p>}
    </form>
  );
}
