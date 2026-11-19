import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fronts, findings, leads } from "@/db/schema";
import { STAGE_LABEL, requiresFinding, type Stage } from "@/contracts/funnel";
import { sessaoAtual } from "@/domains/auth/session";
import { FindingForm } from "./finding-form";
import { MetricsForm } from "./metrics-form";
import { checkEngagement } from "@/contracts/engagement";
import { FINDING_KIND_LABEL, type FindingKind } from "@/contracts/finding";
import { StageButtons, ContactForm, ReplyForm } from "./journey-forms";
import { contactHistory } from "@/domains/leads/journey";
import type { Channel } from "@/contracts/funnel";

type Props = { params: Promise<{ id: string }> };

export default async function LeadPage({ params }: Props) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const { id } = await params;

  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) notFound();

  const [front] = await db.select().from(fronts).where(eq(fronts.id, lead.frontId)).limit(1);
  const list = await db
    .select()
    .from(findings)
    .where(eq(findings.leadId, id))
    .orderBy(desc(findings.verifiedAt));

  const historico = await contactHistory(id);
  const canal: Channel =
    front && ["instagram", "whatsapp", "email", "indicacao"].includes(front.channel)
      ? (front.channel as Channel)
      : "instagram";
  const temEnvio = historico.length > 0;
  const temFollowUp = historico.some((c) => c.isFollowUp);

  const signals = Object.entries(lead.signals ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );

  const bloqueado =
    requiresFinding(lead.stage as Stage) && !list.some((f) => f.origin === "conferido");

  const engajamento = front?.usesEngagement
    ? checkEngagement({
        followers: lead.followers,
        engagement: lead.engagementPct,
        frontMin: front.engagementMin,
      })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            {front?.name ?? "frente"} · {lead.source}
          </p>
          <h1 className="text-2xl font-semibold">{lead.name}</h1>
        </div>
        <Link href="/leads" className="text-sm underline">
          voltar
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-zinc-500">etapa</dt>
          <dd>{STAGE_LABEL[lead.stage as Stage] ?? lead.stage}</dd>
          <dt className="text-zinc-500">categoria</dt>
          <dd>{lead.category ?? "—"}</dd>
          <dt className="text-zinc-500">nota</dt>
          <dd>
            {lead.rating ?? "—"}
            {lead.reviewCount ? ` (${lead.reviewCount} avaliações)` : ""}
          </dd>
          <dt className="text-zinc-500">instagram</dt>
          <dd>{lead.instagram ? `@${lead.instagram}` : "—"}</dd>
          <dt className="text-zinc-500">seguidores</dt>
          <dd>{lead.followers?.toLocaleString("pt-BR") ?? "—"}</dd>
          <dt className="text-zinc-500">engajamento</dt>
          <dd>
            {lead.engagementPct != null ? `${lead.engagementPct}%` : "—"}
            {engajamento && !engajamento.ok ? ` · ${engajamento.message}` : ""}
            {engajamento?.ok ? ` · acima do piso de ${engajamento.floor}%` : ""}
            {front && !front.usesEngagement ? " · esta frente não usa engajamento" : ""}
          </dd>
          <dt className="text-zinc-500">site</dt>
          <dd className="truncate">{lead.site ?? "—"}</dd>
          <dt className="text-zinc-500">telefone</dt>
          <dd>{lead.phone ?? "—"}</dd>
        </dl>

        <div className="border border-zinc-300 p-3">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
            Sinais da importação
          </h2>
          {signals.length === 0 ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {signals.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="text-zinc-500">{k}</span>
                  <span className="truncate text-right">
                    {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border border-zinc-300 p-4">
        <h2 className="mb-3 text-lg font-medium">Estado</h2>
        <p className="mb-3 text-sm">
          Etapa atual: <b>{STAGE_LABEL[lead.stage as Stage] ?? lead.stage}</b>
        </p>
        <StageButtons leadId={lead.id} current={lead.stage as Stage} />
        <div className="mt-4 border-t border-zinc-200 pt-4">
          <MetricsForm
            leadId={lead.id}
            followers={lead.followers}
            engagementPct={lead.engagementPct}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Contatos</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Um envio e um follow-up único. Depois disso, não insistir.
        </p>

        {historico.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">Nenhum envio registrado.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {historico.map((c) => (
              <li key={c.id} className="border border-zinc-200 p-3 text-sm">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {c.channel} · {c.isFollowUp ? "follow-up" : "primeira mensagem"} ·{" "}
                  {c.sentAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.message}</p>
                {c.repliedAt ? (
                  <p className="mt-1 text-xs text-emerald-700">
                    resposta: {c.replyKind} em{" "}
                    {c.repliedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </p>
                ) : (
                  <ReplyForm leadId={lead.id} contactId={c.id} />
                )}
              </li>
            ))}
          </ul>
        )}

        {(lead.stage === "aprovado" || lead.stage === "contatado") && (
          <ContactForm
            leadId={lead.id}
            canal={canal}
            temEnvio={temEnvio}
            temFollowUp={temFollowUp}
          />
        )}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-medium">Achados verificados</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Toda afirmação sobre este lead precisa de um achado com URL e data.
        </p>

        {bloqueado && (
          <p className="mb-3 border-l-2 border-red-600 pl-3 text-sm text-red-700">
            A etapa atual exige ao menos um achado verificado.
          </p>
        )}

        {list.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum achado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((f) => (
              <li key={f.id} className="border border-zinc-200 p-3 text-sm">
                <p>{f.summary}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {FINDING_KIND_LABEL[f.kind as FindingKind] ?? f.kind} ·{" "}
                  {f.origin === "script" ? "medido por script" : "conferido no navegador"} ·
                  confiança {f.confidence} · verificado em{" "}
                  {f.verifiedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·{" "}
                  <a href={f.evidenceUrl} className="underline" target="_blank" rel="noreferrer">
                    {f.evidenceUrl}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-zinc-300 p-4">
        <h2 className="mb-3 text-lg font-medium">Registrar achado</h2>
        <FindingForm leadId={lead.id} />
      </section>
    </main>
  );
}
