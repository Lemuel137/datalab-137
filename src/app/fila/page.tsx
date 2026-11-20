import type { ReactNode } from "react";
import Link from "next/link";
import { activeFronts, buildQueue } from "@/domains/outreach/queue";
import type { QItem } from "@/contracts/queue";
import { QueueItem, type QueueRow } from "./queue-item";

export const dynamic = "force-dynamic";

const SP = "America/Sao_Paulo";
const fmtDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});
const fmtWhen = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP,
  hour: "2-digit",
  minute: "2-digit",
});

function toRow(it: QItem): QueueRow {
  const s = it.lead.signals;
  const place = [s.cidade, s.uf].filter((v) => typeof v === "string" && v).join("/");
  const url = it.finding?.evidenceUrl ?? "";
  return {
    leadId: it.lead.id,
    name: it.lead.name,
    place: place || null,
    score: typeof s.score === "number" ? s.score : null,
    finding: it.finding?.summary ?? null,
    findingWhen: it.finding ? fmtWhen.format(it.finding.verifiedAt) : null,
    byAi: it.finding?.hookBy === "ia",
    evidenceUrl: /^https?:\/\//.test(url) ? url : null,
    message: it.message,
    link: it.link,
  };
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  indicacao: "Indicação",
};

export default async function FilaPage({
  searchParams,
}: {
  searchParams: Promise<{ frente?: string }>;
}) {
  const { frente } = await searchParams;
  const frontList = await activeFronts();
  const slug = frente ?? (frontList.find((f) => f.messageTemplate) ?? frontList[0])?.slug;
  const now = new Date();
  const data = slug ? await buildQueue(slug, now) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">{fmtDay.format(now)}</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-9 tracking-tight">Fila de hoje</h1>
        </div>
        <nav aria-label="Frente" className="card flex flex-wrap gap-1 rounded-md p-1 text-[13px]">
          {frontList.map((f) => (
            <Link
              key={f.id}
              href={`/fila?frente=${f.slug}`}
              aria-current={f.slug === slug ? "page" : undefined}
              className={`rounded-sm px-3 py-1.5 ${
                f.slug === slug ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {f.name}
            </Link>
          ))}
        </nav>
      </header>

      {!data ? (
        <p className="text-sm text-ink-muted">Nenhuma frente ativa encontrada.</p>
      ) : (
        <Fila front={data.front} queue={data.queue} now={now} />
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  note,
  progress,
}: {
  label: string;
  value: number;
  note: string;
  /** 0 a 1; sem valor, não mostra a barra. */
  progress?: number;
}) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="mt-1 font-mono text-[28px] font-medium leading-8 tracking-tight">
        {value}
        <span className="ml-1.5 font-sans text-[13px] font-normal tracking-normal text-ink-muted">
          {note}
        </span>
      </p>
      {progress !== undefined && (
        <div className="mt-3 h-1 overflow-hidden rounded-sm bg-surface-raised" aria-hidden="true">
          <div
            className="h-full rounded-sm bg-brand-text"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Side({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="card px-5 py-4">
      <h2 className="flex justify-between text-[15px] font-semibold">
        {title}
        <span className="font-mono font-medium text-ink-muted">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Fila({
  front,
  queue,
  now,
}: {
  front: NonNullable<Awaited<ReturnType<typeof buildQueue>>>["front"];
  queue: NonNullable<Awaited<ReturnType<typeof buildQueue>>>["queue"];
  now: Date;
}) {
  const locked = queue.waitMs > 0;
  const copyOnOpen = front.channel === "instagram";
  const channel = CHANNEL_LABEL[front.channel] ?? front.channel;
  const { excluded } = queue;
  const out = excluded.vencidos.length + excluded.semGancho.length;
  const row = "flex justify-between gap-3 border-t border-line py-1.5 text-sm";

  return (
    <>
      <section className="card grid gap-6 p-6 sm:grid-cols-3">
        <Stat
          label="Meta da semana"
          value={queue.sentNewThisWeek}
          note={`de ${front.weeklyTarget} abordados`}
          progress={front.weeklyTarget ? queue.sentNewThisWeek / front.weeklyTarget : 0}
        />
        <Stat
          label="Novos para hoje"
          value={queue.novos.length}
          note={`de ${queue.quota} na cota`}
        />
        <Stat
          label={`${channel} hoje`}
          value={queue.sentToday}
          note={`de ${front.dailyLimit} enviados`}
          progress={front.dailyLimit ? queue.sentToday / front.dailyLimit : 0}
        />
      </section>

      {locked && (
        <p className="text-sm text-warning">
          Próximo envio liberado às {fmtTime.format(new Date(now.getTime() + queue.waitMs))}{" "}
          (intervalo mínimo do canal). Recarregue a página depois disso.
        </p>
      )}
      {excluded.semTexto && (
        <p className="text-sm text-danger">
          Esta frente não tem texto de mensagem.{" "}
          <Link href="/frentes" className="underline">
            Configure em frentes
          </Link>
          .
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_296px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-4 flex items-baseline gap-2 text-xl font-semibold tracking-tight">
              Novos{" "}
              <span className="font-mono text-[13px] text-ink-muted">{queue.novos.length}</span>
            </h2>
            {queue.novos.length === 0 ? (
              <p className="card p-5 text-sm text-ink-muted">
                Nenhum lead novo para hoje nesta frente.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {queue.novos.map((it, i) => (
                  <QueueItem
                    key={it.lead.id}
                    row={toRow(it)}
                    kind="first"
                    channel={channel}
                    copyOnOpen={copyOnOpen}
                    locked={locked}
                    next={i === 0}
                  />
                ))}
              </ul>
            )}
          </section>

          {queue.followUps.length > 0 && (
            <section>
              <h2 className="mb-1 flex items-baseline gap-2 text-xl font-semibold tracking-tight">
                Follow-ups{" "}
                <span className="font-mono text-[13px] text-ink-muted">
                  {queue.followUps.length}
                </span>
              </h2>
              <p className="mb-4 text-[13px] text-ink-muted">
                Um follow-up único, 3 dias úteis depois do envio. Depois disso, não insistir.
              </p>
              <ul className="flex flex-col gap-4">
                {queue.followUps.map((it) => (
                  <QueueItem
                    key={it.lead.id}
                    row={toRow(it)}
                    kind="followup"
                    channel={channel}
                    copyOnOpen={copyOnOpen}
                    locked={locked}
                    next={queue.novos.length === 0 && it === queue.followUps[0]}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Side title="Follow-ups" count={queue.followUps.length}>
            <p className="mt-1 text-[13px] text-ink-muted">
              {queue.followUps.length === 0
                ? "Nenhum vence hoje."
                : "Vencem hoje, abaixo dos novos."}
            </p>
          </Side>

          <Side title="Responderam" count={queue.replied.length}>
            <ul className="mt-2">
              {queue.replied.map((l) => (
                <li key={l.id} className={row}>
                  <Link href={`/leads/${l.id}`} className="truncate hover:text-brand-text">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Side>

          <Side title="Fora da fila" count={out + excluded.semContato + excluded.semEngajamento}>
            <ul className="mt-2">
              <li className={row}>
                Sem achado válido (vencido ou vetado)
                <span className="font-mono text-ink-muted">{excluded.vencidos.length}</span>
              </li>
              <li className={row}>
                Falta gancho no achado
                <span className="font-mono text-ink-muted">{excluded.semGancho.length}</span>
              </li>
              <li className={row}>
                Sem contato em {channel}
                <span className="font-mono text-ink-muted">{excluded.semContato}</span>
              </li>
              <li className={row}>
                Engajamento não medido
                <span className="font-mono text-ink-muted">{excluded.semEngajamento}</span>
              </li>
            </ul>
            {out > 0 && (
              <details className="mt-2 border-t border-line pt-2 text-sm">
                <summary className="text-brand-text">ver quem são</summary>
                <ul className="mt-1 flex flex-col gap-1">
                  {[...excluded.vencidos, ...excluded.semGancho].map((l) => (
                    <li key={l.id}>
                      <Link href={`/leads/${l.id}`} className="hover:text-brand-text">
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Side>
        </aside>
      </div>
    </>
  );
}
