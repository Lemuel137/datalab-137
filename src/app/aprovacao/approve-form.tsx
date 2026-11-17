"use client";

import { useActionState } from "react";
import { approve } from "./actions";
import { CHANNELS } from "@/contracts/funnel";
import type { OutreachState } from "@/contracts/outreach";

export function ApproveForm({ disponivel }: { disponivel: Record<string, number> }) {
  const [state, action, pending] = useActionState<OutreachState, FormData>(approve, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Canal
        <select name="channel" defaultValue="instagram" className="border border-zinc-300 p-2">
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c} ({disponivel[c] ?? 0} qualificado(s))
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-32 flex-col gap-1 text-sm">
        Lote
        <input
          name="requested"
          type="number"
          min={1}
          defaultValue={5}
          className="border border-zinc-300 p-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "aprovando..." : "aprovar lote"}
      </button>

      {state && (
        <p className={`text-sm sm:ml-4 ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
