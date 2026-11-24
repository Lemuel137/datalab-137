import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, gte } from "drizzle-orm";
import { sessaoAtual } from "@/domains/auth/session";
import { db } from "@/db/client";
import { contacts, fronts, leads } from "@/db/schema";
import { spDay } from "@/contracts/queue";

export const dynamic = "force-dynamic";

const DAYS = 14;
const fmtDay = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});
const fmtTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

/** O que foi enviado nos últimos dias, mensagem por mensagem, do mais recente ao mais antigo. */
export default async function EnviadasPage() {
  if (!(await sessaoAtual())) redirect("/login");
  const now = new Date();
  const rows = await db
    .select({
      id: contacts.id,
      sentAt: contacts.sentAt,
      message: contacts.message,
      channel: contacts.channel,
      isFollowUp: contacts.isFollowUp,
      repliedAt: contacts.repliedAt,
      leadId: leads.id,
      name: leads.name,
      note: leads.note,
      front: fronts.name,
    })
    .from(contacts)
    .innerJoin(leads, eq(contacts.leadId, leads.id))
    .innerJoin(fronts, eq(leads.frontId, fronts.id))
    .where(gte(contacts.sentAt, new Date(now.getTime() - DAYS * 24 * 3600_000)))
    .orderBy(desc(contacts.sentAt));

  const days = new Map<string, typeof rows>();
  for (const r of rows) days.set(spDay(r.sentAt), [...(days.get(spDay(r.sentAt)) ?? []), r]);
  const today = spDay(now);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-[32px] font-semibold leading-9 tracking-tight">Enviadas</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Mensagens registradas nos últimos {DAYS} dias.{" "}
          <span className="font-mono">{days.get(today)?.length ?? 0}</span> hoje.
        </p>
      </header>

      {rows.length === 0 && <p className="text-sm text-ink-muted">Nenhum envio no período.</p>}

      {[...days].map(([day, list]) => (
        <section key={day}>
          <h2 className="label-caps mb-3">
            {day === today ? "hoje" : fmtDay.format(list[0].sentAt)} ·{" "}
            <span className="font-mono">{list.length}</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {list.map((r) => (
              <li key={r.id} className="card flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link
                    href={`/leads/${r.leadId}`}
                    className="font-semibold tracking-tight hover:text-brand-text"
                  >
                    {r.name}
                  </Link>
                  <span className="text-[13px] text-ink-muted">
                    <span className="font-mono">{fmtTime.format(r.sentAt)}</span> · {r.front} ·{" "}
                    {r.channel}
                    {r.isFollowUp && " · follow-up"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                {(r.repliedAt || r.note) && (
                  <p className="text-[13px] text-ink-muted">
                    {r.repliedAt && <span className="text-success">Respondeu. </span>}
                    {r.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
