"use client";

import { useState } from "react";
import {
  BRIEFING_QUESTIONS,
  UFS,
  answerLines,
  progress,
  type BriefingAnswers,
  type BriefingField,
} from "@/contracts/briefing";

type Status = { ok: boolean; text: string } | null;

const toggle = (on: boolean) =>
  `rounded-md border px-3 py-1.5 text-sm ${
    on
      ? "border-brand-text bg-brand-soft text-ink"
      : "border-line-strong text-ink-muted hover:text-ink"
  }`;
const split = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);

/** Um campo do briefing, desenhado pelo tipo: texto, valor, escolha única, várias, estados. */
function Field({
  field,
  value,
  onChange,
  labelledBy,
}: {
  field: BriefingField;
  value: string;
  /** Aceita o valor novo ou uma função do valor atual (cliques seguidos não se atropelam). */
  onChange: (v: string | ((prev: string) => string)) => void;
  labelledBy: string;
}) {
  const id = `f-${field.id}`;
  const flip = (item: string) =>
    onChange((prev) => {
      const now = split(prev);
      return (now.includes(item) ? now.filter((x) => x !== item) : [...now, item]).join(",");
    });

  if (field.kind === "long") {
    return (
      <textarea
        id={id}
        aria-labelledby={labelledBy}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={4000}
        className="field w-full"
      />
    );
  }

  const label = (
    <span id={`${id}-l`} className="text-sm font-medium">
      {field.label}
      {field.hint && <span className="font-normal text-ink-muted"> {field.hint}</span>}
    </span>
  );

  if (field.kind === "short") {
    return (
      <label className="flex flex-col gap-1.5">
        {label}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={400}
          className="field w-full"
        />
      </label>
    );
  }

  if (field.kind === "money") {
    return (
      <label className="flex flex-col gap-1.5">
        {label}
        <span className="flex items-center gap-2">
          <span className="text-ink-muted">R$</span>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={9}
            className="field w-36 font-mono"
          />
        </span>
      </label>
    );
  }

  const options = "options" in field ? field.options : UFS.map((uf) => ({ value: uf, label: uf }));
  const many = field.kind !== "choice";
  return (
    <div role="group" aria-labelledby={`${id}-l`} className="flex flex-col gap-1.5">
      {label}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = many ? split(value).includes(o.value) : value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() =>
                many ? flip(o.value) : onChange((prev) => (prev === o.value ? "" : o.value))
              }
              className={`${toggle(on)} ${field.kind === "ufs" ? "w-12 px-0 font-mono" : ""}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Estados só aparecem para "alguns estados"; cidades, só para "algumas cidades". */
function visible(field: BriefingField, a: BriefingAnswers): boolean {
  if (field.id === "regiao_ufs") return a.regiao_abrangencia === "estados";
  if (field.id === "regiao_cidades") return a.regiao_abrangencia === "cidades";
  return true;
}

function Answers({ answers }: { answers: BriefingAnswers }) {
  return (
    <dl className="flex flex-col gap-4 border-t border-line pt-4">
      {BRIEFING_QUESTIONS.map((q) => {
        const lines = answerLines(q, answers);
        return (
          <div key={q.id}>
            <dt className="text-sm font-medium">{q.title}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
              {lines.length ? lines.join("\n") : "Sem resposta."}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

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
        <Answers answers={answers} />
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
        <section key={q.id} className="card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <span className="label-caps">
              Pergunta {i + 1} de {total}
            </span>
            <h2 id={`q-${q.id}`} className="text-xl font-semibold tracking-tight">
              {q.title}
            </h2>
            <p className="text-sm text-ink-muted">{q.why}</p>
          </div>
          {q.fields
            .filter((f) => visible(f, answers))
            .map((f) => (
              <Field
                key={f.id}
                field={f}
                value={answers[f.id] ?? ""}
                labelledBy={`q-${q.id}`}
                onChange={(v) =>
                  setAnswers((a) => ({
                    ...a,
                    [f.id]: typeof v === "function" ? v(a[f.id] ?? "") : v,
                  }))
                }
              />
            ))}
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
