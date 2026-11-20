import { BRIEFING_QUESTIONS, progress } from "@/contracts/briefing";
import { listBriefings } from "@/domains/briefings/briefings";
import { reabrir } from "./actions";
import { CopyLink, CreateForm } from "./create-form";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function BriefingsPage() {
  const list = await listBriefings();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header>
        <p className="label-caps">Quem vai prospectar</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-9 tracking-tight">Briefings</h1>
      </header>
      <p className="text-ink-muted">
        Cada briefing é um link para a pessoa descrever o negócio dela e o cliente que procura, em
        doze perguntas abertas. Quem responde não precisa de login e não vê nada do CRM. As
        respostas aparecem aqui, e é com elas que a frente dela é montada.
      </p>

      <section className="card p-6">
        <CreateForm />
      </section>

      {list.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum briefing criado.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {list.map((b) => {
            const p = progress(b.answers);
            return (
              <li key={b.id}>
                <details className="card">
                  <summary className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-semibold tracking-tight">
                        {b.title}
                      </span>
                      <span className="block text-[13px] leading-5 text-ink-muted">
                        criado {fmt.format(b.createdAt)} ·{" "}
                        <span className="font-mono">
                          {p.done} de {p.total}
                        </span>{" "}
                        respondidas
                      </span>
                    </span>
                    <span className={`chip ${b.submittedAt ? "text-success" : ""}`}>
                      {b.submittedAt
                        ? `enviado ${fmt.format(b.submittedAt)}`
                        : p.done > 0
                          ? "em rascunho"
                          : "não aberto"}
                    </span>
                  </summary>
                  <div className="flex flex-col gap-4 px-5 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyLink path={`/b/${b.token}`} />
                      <a
                        href={`/b/${b.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn text-[13px]"
                      >
                        abrir como a pessoa vê ↗
                      </a>
                      {b.submittedAt && (
                        <form action={reabrir}>
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="btn btn-ghost text-[13px]">
                            reabrir para edição
                          </button>
                        </form>
                      )}
                    </div>
                    <dl className="flex flex-col gap-4 border-t border-line pt-4">
                      {BRIEFING_QUESTIONS.map((q) => (
                        <div key={q.id}>
                          <dt className="text-sm font-medium">{q.title}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">
                            {b.answers[q.id] || "Sem resposta."}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
