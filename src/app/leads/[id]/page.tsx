import { notFound, redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fronts, findings, leads } from "@/db/schema";
import { STAGE_LABEL, requiresFinding, type Stage } from "@/contracts/funnel";
import { sessaoAtual } from "@/domains/auth/session";
import { FindingForm, ReconfirmButton } from "./finding-form";
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="label-caps">
            {front?.name ?? "frente"} · {lead.source}
          </p>
          <h1 className="text-[32px] font-semibold leading-9 tracking-tight">{lead.name}</h1>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">etapa</dt>
          <dd>{STAGE_LABEL[lead.stage as Stage] ?? lead.stage}</dd>
          <dt className="text-ink-muted">categoria</dt>
          <dd>{lead.category ?? "—"}</dd>
          <dt className="text-ink-muted">nota</dt>
          <dd>
            {lead.rating ?? "—"}
            {lead.reviewCount ? ` (${lead.reviewCount} avaliações)` : ""}
          </dd>
          <dt className="text-ink-muted">instagram</dt>
          <dd>{lead.instagram ? `@${lead.instagram}` : "—"}</dd>
          <dt className="text-ink-muted">seguidores</dt>
          <dd>{lead.followers?.toLocaleString("pt-BR") ?? "—"}</dd>
          <dt className="text-ink-muted">engajamento</dt>
          <dd>
            {lead.engagementPct != null ? `${lead.engagementPct}%` : "—"}
            {engajamento && !engajamento.ok ? ` · ${engajamento.message}` : ""}
            {engajamento?.ok ? ` · acima do piso de ${engajamento.floor}%` : ""}
            {front && !front.usesEngagement ? " · esta frente não usa engajamento" : ""}
          </dd>
          <dt className="text-ink-muted">site</dt>
          <dd className="truncate">{lead.site ?? "—"}</dd>
          <dt className="text-ink-muted">telefone</dt>
          <dd>{lead.phone ?? "—"}</dd>
        </dl>

        <div className="card p-5">
          <h2 className="mb-2 label-caps">Sinais da importação</h2>
          {signals.length === 0 ? (
            <p className="text-sm text-ink-muted">—</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {signals.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="text-ink-muted">{k}</span>
                  <span className="truncate text-right">
                    {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Estado</h2>
        <p className="mb-3 text-sm">
          Etapa atual: <b>{STAGE_LABEL[lead.stage as Stage] ?? lead.stage}</b>
        </p>
        <StageButtons leadId={lead.id} current={lead.stage as Stage} />
        <div className="mt-4 border-t border-line pt-4">
          <MetricsForm
            leadId={lead.id}
            followers={lead.followers}
            engagementPct={lead.engagementPct}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Contatos</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Um envio e um follow-up único. Depois disso, não insistir.
        </p>

        {historico.length === 0 ? (
          <p className="mb-4 text-sm text-ink-muted">Nenhum envio registrado.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {historico.map((c) => (
              <li key={c.id} className="card p-3 text-sm">
                <p className="label-caps">
                  {c.channel} · {c.isFollowUp ? "follow-up" : "primeira mensagem"} ·{" "}
                  {c.sentAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{c.message}</p>
                {c.repliedAt ? (
                  <p className="mt-1 text-xs text-success">
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
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Achados verificados</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Toda afirmação sobre este lead precisa de um achado com URL e data.
        </p>

        {bloqueado && (
          <p className="mb-3 border-l-2 border-danger pl-3 text-sm text-danger">
            A etapa atual exige ao menos um achado verificado.
          </p>
        )}

        {list.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum achado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((f) => (
              <li key={f.id} className="card p-3 text-sm">
                <p>{f.summary}</p>
                {(f.hook || f.customerSide) && (
                  <p className="mt-1 text-xs text-ink-muted">
                    gancho: {f.hook ?? "—"} · lado do cliente: {f.customerSide ?? "—"}
                  </p>
                )}
                {f.hookBy === "ia" && (
                  <p className="mt-1 text-xs text-ink-muted">Revisado por IA: sustenta mensagem.</p>
                )}
                {f.hookBy === "vetado" && (
                  <p className="mt-1 text-xs text-warning">
                    A IA leu este achado e vetou: ele não sustenta uma mensagem.
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-muted">
                  {FINDING_KIND_LABEL[f.kind as FindingKind] ?? f.kind} ·{" "}
                  {f.origin === "script" ? "medido por script" : "conferido no navegador"} ·
                  confiança {f.confidence} · verificado em{" "}
                  {f.verifiedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·{" "}
                  <a href={f.evidenceUrl} className="underline" target="_blank" rel="noreferrer">
                    {f.evidenceUrl}
                  </a>
                </p>
                {f.origin === "conferido" && <ReconfirmButton findingId={f.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">Registrar achado</h2>
        <FindingForm leadId={lead.id} />
      </section>
    </main>
  );
}
