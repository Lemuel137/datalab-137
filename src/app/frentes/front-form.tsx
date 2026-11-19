"use client";

import { useActionState } from "react";
import { saveFront } from "./actions";
import type { LeadActionState } from "@/contracts/journey";

export type FrontRow = {
  id: string;
  name: string;
  slug: string;
  channel: string;
  dailyLimit: number;
  weeklyTarget: number;
  findingPolicy: string;
  messageTemplate: string | null;
  followUpTemplate: string | null;
  active: boolean;
};

const WEEKLY = Array.from({ length: 21 }, (_, i) => i * 5);
const field = "border border-zinc-300 px-2 py-1 text-sm";
const label = "flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-500";

export function FrontForm({ front }: { front: FrontRow }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(saveFront, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 border border-zinc-300 p-4">
      <input type="hidden" name="id" value={front.id} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">{front.name}</h2>
        <span className="text-sm text-zinc-500">
          {front.slug} · {front.channel}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className={label}>
          Leads novos por semana
          <select name="weeklyTarget" defaultValue={front.weeklyTarget} className={field}>
            {WEEKLY.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Limite diário do canal
          <input
            name="dailyLimit"
            type="number"
            min={1}
            max={50}
            defaultValue={front.dailyLimit}
            className={field}
          />
        </label>
        <label className={label}>
          O que libera o envio
          <select name="findingPolicy" defaultValue={front.findingPolicy} className={field}>
            <option value="conferido">achado conferido no navegador hoje</option>
            <option value="script">achado medido por script (24 h)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input name="active" type="checkbox" defaultChecked={front.active} />
          frente ativa
        </label>
      </div>

      <label className={label}>
        Primeira mensagem (use {"{nome}"} e {"{achado}"})
        <textarea
          name="messageTemplate"
          rows={4}
          defaultValue={front.messageTemplate ?? ""}
          className={`${field} normal-case tracking-normal text-zinc-900`}
        />
      </label>
      <label className={label}>
        Follow-up único
        <textarea
          name="followUpTemplate"
          rows={2}
          defaultValue={front.followUpTemplate ?? ""}
          className={`${field} normal-case tracking-normal text-zinc-900`}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-zinc-900 bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          salvar
        </button>
        {state && (
          <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
