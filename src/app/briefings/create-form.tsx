"use client";

import { useActionState, useState } from "react";
import { criar } from "./actions";
import type { LeadActionState } from "@/contracts/journey";

export function CreateForm() {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(criar, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="label-caps">Para quem é</span>
        <input name="title" required maxLength={120} className="field" />
      </label>
      <button type="submit" disabled={pending} className="btn btn-brand py-2">
        criar link de briefing
      </button>
      {state && (
        <p className={`w-full text-sm ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn text-[13px]"
      onClick={() =>
        navigator.clipboard.writeText(`${window.location.origin}${path}`).then(
          () => setCopied(true),
          () => setCopied(false),
        )
      }
    >
      {copied ? "link copiado" : "copiar link"}
    </button>
  );
}
