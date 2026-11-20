"use client";

import { useState } from "react";
import { BRIEFING_QUESTIONS, progress, type BriefingAnswers } from "@/contracts/briefing";

type Status = { ok: boolean; text: string } | null;

export function BriefingForm({
  token,
  initial,
  submitted,
}: {
  token: string;
  initial: BriefingAnswers;
  submitted: boolean;
}) {
  const [answers, setAnswers] = useState<BriefingAnswers>(initial);
  const [sent, setSent] = useState(submitted);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const { done, total } = progress(answers);

  async function save(submit: boolean) {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/briefing/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, submit }),
      });
      const body = (await res.json()) as { mensagem?: string; erro?: string };
      setStatus({ ok: res.ok, text: body.mensagem ?? body.erro ?? "Não foi possível salvar." });
      if (res.ok && submit) setSent(true);
    } catch {
      setStatus({ ok: false, text: "Sem conexão. Suas respostas continuam aqui; tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <section className="card flex flex-col gap-4 p-6">
        <h2 className="text-xl font-semibold tracking-tight">Briefing enviado</h2>
        <p className="text-ink-muted">
          Suas respostas chegaram. O próximo passo é montar a sua lista a partir delas; se alguma
          resposta precisar de detalhe, a gente te chama.
        </p>
        <dl className="flex flex-col gap-4 border-t border-line pt-4">
          {BRIEFING_QUESTIONS.map((q) => (
            <div key={q.id}>
              <dt className="text-sm font-medium">{q.title}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                {answers[q.id] || "Sem resposta."}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save(true);
      }}
    >
      {BRIEFING_QUESTIONS.map((q, i) => (
        <section key={q.id} className="card flex flex-col gap-3 p-6">
          <label htmlFor={q.id} className="flex flex-col gap-1">
            <span className="label-caps">
              Pergunta {i + 1} de {total}
            </span>
            <span className="text-xl font-semibold tracking-tight">{q.title}</span>
          </label>
          <p id={`${q.id}-why`} className="text-sm text-ink-muted">
            {q.why}
          </p>
          <textarea
            id={q.id}
            aria-describedby={`${q.id}-why`}
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            rows={4}
            maxLength={4000}
            className="field w-full"
          />
        </section>
      ))}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-line bg-ground py-4">
        <span className="font-mono text-[13px] text-ink-muted">
          {done} de {total} respondidas
        </span>
        <span
          aria-live="polite"
          className={`text-sm ${status?.ok ? "text-success" : "text-danger"}`}
        >
          {status?.text}
        </span>
        <span className="ml-auto flex gap-2">
          <button type="button" disabled={busy} onClick={() => void save(false)} className="btn">
            salvar e terminar depois
          </button>
          <button type="submit" disabled={busy || done === 0} className="btn btn-brand">
            enviar briefing
          </button>
        </span>
      </div>
    </form>
  );
}
