"use client";

import { useActionState } from "react";
import { addFinding, reconfirm } from "./actions";
import { FINDING_KINDS, FINDING_KIND_LABEL, type FindingFormState } from "@/contracts/finding";

export function FindingForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState<FindingFormState, FormData>(
    addFinding,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />

      <label className="flex flex-col gap-1 text-sm">
        Achado
        <textarea
          name="summary"
          rows={3}
          required
          className="border border-zinc-300 p-2 text-sm"
          placeholder="O que foi verificado, em uma frase objetiva"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Gancho: algo da empresa que abre a mensagem (opcional)
        <input
          name="hook"
          className="border border-zinc-300 p-2 text-sm"
          placeholder='o anúncio de vocês que fala das peças "embaladas com carinho"'
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Lado do cliente: quem perde com isso (opcional)
        <input
          name="customerSide"
          className="border border-zinc-300 p-2 text-sm"
          placeholder="Quem cai ali é justamente a cliente que queria voltar para comprar"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-1 text-sm">
          Onde foi verificado
          <input
            name="evidenceUrl"
            type="url"
            required
            className="border border-zinc-300 p-2 text-sm"
            placeholder="https://"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confiança
          <select
            name="confidence"
            defaultValue="media"
            className="border border-zinc-300 p-2 text-sm"
          >
            <option value="alta">alta</option>
            <option value="media">média</option>
            <option value="baixa">baixa</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select name="kind" defaultValue="outro" className="border border-zinc-300 p-2 text-sm">
            {FINDING_KINDS.map((k) => (
              <option key={k} value={k}>
                {FINDING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Origem
          <select
            name="origin"
            defaultValue="conferido"
            className="border border-zinc-300 p-2 text-sm"
          >
            <option value="conferido">conferido no navegador</option>
            <option value="script">medido por script</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "salvando..." : "registrar achado"}
      </button>

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ReconfirmButton({ findingId }: { findingId: string }) {
  const [state, action, pending] = useActionState<FindingFormState, FormData>(reconfirm, undefined);
  return (
    <form action={action} className="mt-2 flex items-center gap-2">
      <input type="hidden" name="findingId" value={findingId} />
      <button
        type="submit"
        disabled={pending}
        className="border border-zinc-900 px-2 py-0.5 text-xs"
      >
        reconferi hoje
      </button>
      {state && (
        <span className={`text-xs ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
