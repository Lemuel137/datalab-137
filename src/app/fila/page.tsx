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
    finding: it.finding?.summary ?? null,
    findingWhen: it.finding ? fmtWhen.format(it.finding.verifiedAt) : null,
    evidenceUrl: /^https?:\/\//.test(url) ? url : null,
    message: it.message,
    link: it.link,
  };
}

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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">{fmtDay.format(now)}</p>
            <h1 className="text-2xl font-semibold">Fila de hoje</h1>
          </div>
          <Link href="/" className="text-sm underline">
            voltar
          </Link>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {frontList.map((f) => (
            <Link
              key={f.id}
              href={`/fila?frente=${f.slug}`}
              className={`border px-2 py-1 ${
                f.slug === slug ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"
              }`}
            >
              {f.name}
            </Link>
          ))}
        </nav>
      </header>

      {!data ? (
        <p className="text-sm text-zinc-500">Nenhuma frente ativa encontrada.</p>
      ) : (
        <Fila front={data.front} queue={data.queue} now={now} />
      )}
    </main>
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
  const { excluded } = queue;

  return (
    <>
      <section className="border border-zinc-300 p-4 text-sm">
        <p>
          Meta da semana: <strong>{front.weeklyTarget}</strong> · hoje:{" "}
          <strong>{queue.quota}</strong> novos · {front.channel}:{" "}
          <strong>
            {queue.sentToday} de {front.dailyLimit}
          </strong>{" "}
          enviados hoje
        </p>
        {locked && (
          <p className="mt-1 text-amber-700">
            Próximo envio liberado às {fmtTime.format(new Date(now.getTime() + queue.waitMs))}{" "}
            (intervalo mínimo do canal). Recarregue a página depois disso.
          </p>
        )}
        {excluded.semTexto && (
          <p className="mt-1 text-red-700">
            Esta frente não tem texto de mensagem.{" "}
            <Link href="/frentes" className="underline">
              Configure em frentes
            </Link>
            .
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Novos ({queue.novos.length})</h2>
        {queue.novos.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum lead novo para hoje nesta frente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queue.novos.map((it) => (
              <QueueItem
                key={it.lead.id}
                row={toRow(it)}
                kind="first"
                copyOnOpen={copyOnOpen}
                locked={locked}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Follow-ups ({queue.followUps.length})</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Um follow-up único, 3 dias úteis depois do envio. Depois disso, não insistir.
        </p>
        <ul className="flex flex-col gap-3">
          {queue.followUps.map((it) => (
            <QueueItem
              key={it.lead.id}
              row={toRow(it)}
              kind="followup"
              copyOnOpen={copyOnOpen}
              locked={locked}
            />
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Responderam ({queue.replied.length})</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {queue.replied.map((l) => (
            <li key={l.id}>
              <Link href={`/leads/${l.id}`} className="underline">
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-zinc-200 pt-4 text-sm">
        <h2 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Fora da fila</h2>
        <p className="text-zinc-600">
          {excluded.vencidos.length} com achado vencido ou sem achado · {excluded.semContato} sem
          contato em {front.channel} · {excluded.semEngajamento} com engajamento não medido ou
          abaixo do piso
        </p>
        {excluded.vencidos.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {excluded.vencidos.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="underline">
                  {l.name}
                </Link>{" "}
                <span className="text-zinc-500">
                  {front.findingPolicy === "conferido"
                    ? "· conferir o achado hoje"
                    : "· aguardando nova medição"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
