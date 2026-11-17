"use client";

import { useActionState } from "react";
import { addFinding } from "./actions";
import type { FindingFormState } from "@/contracts/finding";

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
