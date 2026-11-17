import Link from "next/link";
import { eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, fronts, leads } from "@/db/schema";
import { CHANNELS } from "@/contracts/funnel";
import { pendingQualified } from "@/domains/outreach/approve";
import { sentTodayByChannel } from "@/domains/outreach/limits";
import { ApproveForm } from "./approve-form";

export const dynamic = "force-dynamic";

export default async function AprovacaoPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const frontList = await db.select().from(fronts);
  const limitePorCanal: Record<string, number> = {};
  for (const f of frontList) {
    limitePorCanal[f.channel] = Math.max(limitePorCanal[f.channel] ?? 0, f.dailyLimit);
  }

  const enviados = await db
    .select({ channel: contacts.channel, sentAt: contacts.sentAt })
    .from(contacts)
    .where(gte(contacts.sentAt, today));

  const usados = sentTodayByChannel(
    enviados.map((e) => ({ channel: e.channel as (typeof CHANNELS)[number], sentAt: e.sentAt })),
    new Date(),
  );

  const disponivel: Record<string, number> = {};
  const pendentes: Record<string, { id: string; name: string }[]> = {};
  for (const c of CHANNELS) {
    const lista = await pendingQualified(c);
    pendentes[c] = lista;
    disponivel[c] = lista.length;
  }

  const aprovados = await db
    .select({ id: leads.id, name: leads.name, frontId: leads.frontId })
    .from(leads)
    .where(eq(leads.stage, "aprovado"));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Aprovação de lote</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/leads" className="underline">
            leads
          </Link>
          <Link href="/" className="underline">
            voltar
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {CHANNELS.map((c) => {
          const limite = limitePorCanal[c] ?? 0;
          const usado = usados[c] ?? 0;
          return (
            <div key={c} className="border border-zinc-300 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{c}</p>
              <p className="text-lg font-semibold">
                {usado}
                <span className="text-sm font-normal text-zinc-500"> / {limite}</span>
              </p>
              <p className="text-xs text-zinc-500">enviados hoje</p>
            </div>
          );
        })}
      </section>

      <section className="border border-zinc-300 p-4">
        <h2 className="mb-1 text-lg font-medium">Aprovar</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Só leads qualificados entram. O limite do canal e o intervalo entre envios são conferidos
          antes de aprovar.
        </p>
        <ApproveForm disponivel={disponivel} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Aprovados para abordagem ({aprovados.length})</h2>
        {aprovados.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {aprovados.map((a) => (
              <li key={a.id} className="flex justify-between border-b border-zinc-200 py-1">
                <span>{a.name}</span>
                <Link href={`/leads/${a.id}`} className="underline">
                  abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Qualificados aguardando</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <div key={c} className="border border-zinc-200 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {c} — {pendentes[c].length}
              </p>
              <ul>
                {pendentes[c].slice(0, 8).map((l) => (
                  <li key={l.id}>{l.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
