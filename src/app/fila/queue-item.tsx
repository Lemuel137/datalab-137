"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { enviei, pular } from "./actions";
import type { LeadActionState } from "@/contracts/journey";

export type QueueRow = {
  leadId: string;
  name: string;
  place: string | null;
  finding: string | null;
  findingWhen: string | null;
  /** Gancho e lado do cliente escritos pela rotina de IA: vale ler antes de enviar. */
  byAi: boolean;
  evidenceUrl: string | null;
  message: string;
  link: string;
};

export function QueueItem({
  row,
  kind,
  copyOnOpen,
  locked,
}: {
  row: QueueRow;
  kind: "first" | "followup";
  /** Instagram não aceita texto no link: a mensagem vai para a área de transferência. */
  copyOnOpen: boolean;
  locked: boolean;
}) {
  const [sent, sendAction, sending] = useActionState<LeadActionState, FormData>(enviei, undefined);
  const [skipped, skipAction, skipping] = useActionState<LeadActionState, FormData>(
    pular,
    undefined,
  );
  const [copied, setCopied] = useState(false);
  // O texto montado é ponto de partida: dá para ajustar antes de abrir a conversa.
  const [text, setText] = useState(row.message);
  const base = row.link.split("?text=")[0];
  const link = row.link.includes("?text=") ? `${base}?text=${encodeURIComponent(text)}` : row.link;
  const state = sent ?? skipped;
  const btn = "border px-3 py-1 text-sm disabled:opacity-50";

  return (
    <li className="flex flex-col gap-2 border border-zinc-300 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/leads/${row.leadId}`} className="font-medium underline">
          {row.name}
        </Link>
        {row.place && <span className="text-sm text-zinc-500">{row.place}</span>}
      </div>

      {row.finding && (
        <p className="text-sm">
          {row.finding}
          {row.findingWhen && (
            <span className="text-zinc-500"> · verificado {row.findingWhen}</span>
          )}
          {row.evidenceUrl && (
            <>
              {" · "}
              <a href={row.evidenceUrl} target="_blank" rel="noreferrer" className="underline">
                ver evidência
              </a>
            </>
          )}
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(10, text.split("\n").length + 2)}
        aria-label={`Mensagem para ${row.name}`}
        className="border border-zinc-300 p-2 text-sm"
      />

      {row.byAi && (
        <p className="text-xs text-amber-700">
          Abertura escrita por IA a partir do anúncio. Leia e ajuste antes de enviar.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {locked ? (
          <span className={`${btn} border-zinc-300 text-zinc-400`}>abrir conversa</span>
        ) : (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className={`${btn} border-zinc-900 bg-zinc-900 text-white`}
            onClick={() => {
              if (!copyOnOpen) return;
              navigator.clipboard.writeText(text).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            abrir conversa
          </a>
        )}
        <form action={sendAction}>
          <input type="hidden" name="leadId" value={row.leadId} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="message" value={text} />
          <button type="submit" disabled={locked || sending} className={`${btn} border-zinc-900`}>
            enviei
          </button>
        </form>
        {kind === "first" && (
          <form action={skipAction}>
            <input type="hidden" name="leadId" value={row.leadId} />
            <button type="submit" disabled={skipping} className={`${btn} border-zinc-300`}>
              pular hoje
            </button>
          </form>
        )}
        {copyOnOpen && (
          <span className="text-xs text-zinc-500">
            {copied ? "mensagem copiada, é só colar" : "ao abrir, a mensagem é copiada"}
          </span>
        )}
      </div>

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}>
          {state.message}
        </p>
      )}
    </li>
  );
}
