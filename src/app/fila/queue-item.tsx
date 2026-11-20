"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { conferi, enviei, pular } from "./actions";
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
  /** Preenchido quando o achado exige conferência e ainda não foi conferido hoje. */
  findingId: string | null;
  /** Onde conferir o achado: cardápio, anúncios, página. */
  links: { label: string; href: string }[];
  /** Itens que a medição apontou (até 12 nomes) e o total. */
  items: { label: string; names: string[]; long: boolean } | null;
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
  const [checked, checkAction, checking] = useActionState<LeadActionState, FormData>(
    conferi,
    undefined,
  );
  const [copied, setCopied] = useState(false);
  // O texto montado é ponto de partida: dá para ajustar antes de abrir a conversa.
  const [text, setText] = useState(row.message);
  const base = row.link.split("?text=")[0];
  const link = row.link.includes("?text=") ? `${base}?text=${encodeURIComponent(text)}` : row.link;
  const state = sent ?? skipped ?? checked;
  // Achado que exige conferência trava a conversa e o registro até o Lemuel conferir.
  const blocked = locked || row.findingId !== null;

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
            <div className="flex flex-col gap-3">
              <p>
                {row.finding}
                {row.findingWhen && (
                  <span className="text-[13px] text-ink-muted"> Verificado {row.findingWhen}.</span>
                )}
              </p>
              {row.links.length > 0 && (
                <p className="flex flex-wrap gap-2">
                  {row.links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      className="btn text-[13px] text-brand-text"
                    >
                      {l.label} ↗
                    </a>
                  ))}
                </p>
              )}
              {row.items && (
                <details className="text-[13px] leading-5">
                  <summary className="text-ink-muted hover:text-ink">{row.items.label}</summary>
                  <ul
                    className={`mt-2 text-ink-muted ${
                      row.items.long ? "flex flex-col gap-2" : "columns-2 gap-6"
                    }`}
                  >
                    {row.items.names.map((n) => (
                      <li key={n} className={row.items?.long ? "" : "truncate"}>
                        {n}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
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

          {row.findingId && (
            <form
              action={checkAction}
              className="flex flex-wrap items-center gap-3 rounded-md bg-brand-soft p-3"
            >
              <input type="hidden" name="findingId" value={row.findingId} />
              <p className="min-w-0 flex-1 text-sm">
                Abra as avaliações e confirme que as reclamações continuam sem resposta. O envio só
                libera depois disso.
              </p>
              <button type="submit" disabled={checking} className="btn btn-brand">
                conferi as avaliações
              </button>
            </form>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {blocked ? (
              <span
                className={`btn ${next && !row.findingId ? "btn-brand" : ""}`}
                aria-disabled="true"
              >
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
              <button type="submit" disabled={blocked || sending} className="btn">
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
