"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { enviei, pular } from "./actions";
import type { LeadActionState } from "@/contracts/journey";

export type QueueRow = {
  leadId: string;
  name: string;
  place: string | null;
  score: number | null;
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
  channel,
  copyOnOpen,
  locked,
  next,
}: {
  row: QueueRow;
  kind: "first" | "followup";
  channel: string;
  /** Instagram não aceita texto no link: a mensagem vai para a área de transferência. */
  copyOnOpen: boolean;
  locked: boolean;
  /** O lead da vez: abre expandido e é o único com a ação principal em destaque. */
  next: boolean;
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

  return (
    <li>
      <details open={next} className={`card ${next ? "border-line-strong" : ""}`}>
        <summary className="flex items-center justify-between gap-4 p-5">
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold tracking-tight">{row.name}</span>
            <span className="block truncate text-[13px] leading-5 text-ink-muted">
              {[row.place, channel].filter(Boolean).join(" · ")}
            </span>
          </span>
          {row.score !== null && <span className="chip font-mono">nota {row.score}</span>}
        </summary>

        <div className="flex flex-col gap-4 px-5 pb-5">
          {row.finding && (
            <p>
              {row.finding}{" "}
              <span className="text-[13px] text-ink-muted">
                {row.findingWhen && `Verificado ${row.findingWhen}`}
                {row.evidenceUrl && (
                  <>
                    {" · "}
                    <a
                      href={row.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-text"
                    >
                      ver evidência
                    </a>
                  </>
                )}
              </span>
            </p>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(12, text.split("\n").length + 3)}
            aria-label={`Mensagem para ${row.name}`}
            className="field w-full"
          />

          {row.byAi && (
            <p className="text-[13px] leading-5 text-warning">
              Abertura escrita por IA a partir do anúncio. Leia e ajuste antes de enviar.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {locked ? (
              <span className={`btn ${next ? "btn-brand" : ""}`} aria-disabled="true">
                abrir conversa
              </span>
            ) : (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className={`btn ${next ? "btn-brand" : ""}`}
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
              <button type="submit" disabled={locked || sending} className="btn">
                enviei
              </button>
            </form>
            {kind === "first" && (
              <form action={skipAction}>
                <input type="hidden" name="leadId" value={row.leadId} />
                <button type="submit" disabled={skipping} className="btn btn-ghost">
                  pular hoje
                </button>
              </form>
            )}
            <Link href={`/leads/${row.leadId}`} className="btn btn-ghost">
              ver lead
            </Link>
            {copyOnOpen && (
              <span className="text-[13px] text-ink-muted">
                {copied ? "mensagem copiada, é só colar" : "ao abrir, a mensagem é copiada"}
              </span>
            )}
          </div>

          {state && (
            <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>
              {state.message}
            </p>
          )}
        </div>
      </details>
    </li>
  );
}
