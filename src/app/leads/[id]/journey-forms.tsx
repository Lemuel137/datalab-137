"use client";

import { useActionState } from "react";
import { addContact, addReply, setStage } from "./journey-actions";
import { CHANNELS, nextStages, STAGE_LABEL, type Channel, type Stage } from "@/contracts/funnel";
import type { LeadActionState } from "@/contracts/journey";

function Msg({ state }: { state: LeadActionState }) {
  if (!state) return null;
  return (
    <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
  );
}

export function StageButtons({ leadId, current }: { leadId: string; current: Stage }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(setStage, undefined);

  const proximas = nextStages(current);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {proximas.map((s) => (
          <form key={s} action={action}>
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="to" value={s} />
            <button
              type="submit"
              disabled={pending}
              className={`border px-3 py-1 text-sm disabled:opacity-50 ${
                s === "descartado"
                  ? "border-red-700 text-red-700"
                  : "border-zinc-900 bg-zinc-900 text-white"
              }`}
            >
              {s === "descartado" ? "descartar" : `avançar para ${STAGE_LABEL[s].toLowerCase()}`}
            </button>
          </form>
        ))}
      </div>
      <Msg state={state} />
    </div>
  );
}

export function ContactForm({
  leadId,
  canal,
  temEnvio,
  temFollowUp,
}: {
  leadId: string;
  canal: Channel;
  temEnvio: boolean;
  temFollowUp: boolean;
}) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(addContact, undefined);

  if (temEnvio && temFollowUp) {
    return <p className="text-sm text-zinc-500">Follow-up único já enviado. Não insistir.</p>;
  }

  if (temEnvio) {
    return (
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="leadId" value={leadId} />
          <input type="hidden" name="channel" value={canal} />
          <input type="hidden" name="message" value="follow-up" />
          <input type="hidden" name="isFollowUp" value="on" />
          <button
            type="submit"
            disabled={pending}
            className="bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            registrar follow-up único
          </button>
        </form>
        <Msg state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm">
        Canal
        <select name="channel" defaultValue={canal} className="border border-zinc-300 p-2">
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Texto enviado
        <textarea name="message" rows={4} required className="border border-zinc-300 p-2 text-sm" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "salvando..." : "registrar envio"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function ReplyForm({ leadId, contactId }: { leadId: string; contactId: string }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(addReply, undefined);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="contactId" value={contactId} />
        <select
          name="replyKind"
          defaultValue="pessoa"
          className="border border-zinc-300 p-1 text-xs"
        >
          <option value="pessoa">pessoa</option>
          <option value="whatsapp">pediu whatsapp</option>
          <option value="robo">robô</option>
          <option value="recusa">recusa</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="border border-zinc-900 px-2 py-1 text-xs"
        >
          registrar resposta
        </button>
      </form>
      <Msg state={state} />
    </div>
  );
}
