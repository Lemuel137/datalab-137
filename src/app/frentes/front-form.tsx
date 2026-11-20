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
const field = "card px-2 py-1 text-sm";
const label = "flex flex-col gap-1 label-caps";

export function FrontForm({ front }: { front: FrontRow }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(saveFront, undefined);

  return (
    <form action={action} className="card flex flex-col gap-4 p-6">
      <input type="hidden" name="id" value={front.id} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">{front.name}</h2>
        <span className="text-sm text-ink-muted">
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
        Primeira mensagem (use {"{gancho}"}, {"{achado}"}, {"{cliente}"} e {"{nome}"})
        <textarea
          name="messageTemplate"
          rows={4}
          defaultValue={front.messageTemplate ?? ""}
          className={`${field} normal-case tracking-normal text-ink`}
        />
      </label>
      <label className={label}>
        Follow-up único
        <textarea
          name="followUpTemplate"
          rows={2}
          defaultValue={front.followUpTemplate ?? ""}
          className={`${field} normal-case tracking-normal text-ink`}
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-solid disabled:opacity-50">
          salvar
        </button>
        {state && (
          <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
