"use client";

import { useActionState } from "react";
import { saveNote } from "./actions";
import type { FindingFormState } from "@/contracts/finding";

/** Observação livre do lead. Usado na página do lead e em cada item da fila. */
export function NoteForm({ leadId, note }: { leadId: string; note: string | null }) {
  const [state, action, pending] = useActionState<FindingFormState, FormData>(saveNote, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label className="flex flex-col gap-1 text-sm">
        Observação
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
          defaultValue={note ?? ""}
          placeholder="Ex.: este número é robô; falar pelo fixo"
          className="field w-full text-sm"
        />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn disabled:opacity-50">
          {pending ? "salvando..." : "salvar observação"}
        </button>
        {state && (
          <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
