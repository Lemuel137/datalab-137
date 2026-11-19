"use client";

import { useActionState } from "react";
import { setMetrics } from "./actions";
import type { FindingFormState } from "@/contracts/finding";

type Props = { leadId: string; followers: number | null; engagementPct: number | null };

export function MetricsForm({ leadId, followers, engagementPct }: Props) {
  const [state, action, pending] = useActionState<FindingFormState, FormData>(
    setMetrics,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm">
        Seguidores
        <input
          name="followers"
          inputMode="numeric"
          defaultValue={followers ?? ""}
          className="w-32 border border-zinc-300 p-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Engajamento (%)
        <input
          name="engagementPct"
          inputMode="decimal"
          defaultValue={engagementPct ?? ""}
          className="w-32 border border-zinc-300 p-2 text-sm"
          placeholder="0,15"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-zinc-900 px-4 py-2 text-sm disabled:opacity-50"
      >
        {pending ? "salvando..." : "salvar medição"}
      </button>
      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
