/**
 * Regras da fila do dia. Tudo aqui é puro: recebe linhas e a hora, devolve a fila.
 * "Dia" e "semana" são sempre de Brasília, porque o servidor roda em UTC.
 */
import { checkEngagement } from "@/contracts/engagement";
import type { Channel, Stage } from "@/contracts/funnel";
import { normalizeInstagram, normalizePhone } from "@/domains/leads/normalize";

// shortcut: Brasília é UTC-3 fixo (sem horário de verão desde 2019); trocar por Intl se voltar.
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A mesma hora "vista" de Brasília, para ler com os getters UTC. */
const sp = (d: Date) => new Date(d.getTime() - SP_OFFSET_MS);
/** Número do dia de Brasília (dias desde 1970). */
const spDayIndex = (d: Date) => Math.floor(sp(d).getTime() / DAY_MS);
/** 1 = segunda … 5 = sexta, 6 = sábado, 0 = domingo. */
const spWeekday = (d: Date) => sp(d).getUTCDay();

export function spDay(d: Date): string {
  return sp(d).toISOString().slice(0, 10);
}

export function isBusinessDay(d: Date): boolean {
  const w = spWeekday(d);
  return w >= 1 && w <= 5;
}

/** Dias úteis depois de `from` até `to`, contando o dia de `to`. */
export function businessDaysBetween(from: Date, to: Date): number {
  let n = 0;
  for (let i = spDayIndex(from) + 1; i <= spDayIndex(to); i++) {
    const w = new Date(i * DAY_MS).getUTCDay();
    if (w >= 1 && w <= 5) n++;
  }
  return n;
}

/** Segunda-feira 00:00 de Brasília da semana de `now`. */
export function weekStart(now: Date): Date {
  const sinceMonday = (spWeekday(now) + 6) % 7;
  return new Date((spDayIndex(now) - sinceMonday) * DAY_MS + SP_OFFSET_MS);
}

/**
 * Quantos leads novos cabem hoje: o que falta da meta da semana, dividido pelos
 * dias úteis que restam (contando hoje), sem passar do que resta no canal.
 * Dia perdido é redistribuído; fim de semana não recebe novos.
 */
export function dailyQuota(i: {
  weeklyTarget: number;
  sentNewThisWeek: number;
  channelRemaining: number;
  now: Date;
}): number {
  if (!isBusinessDay(i.now)) return 0;
  const daysLeft = 6 - spWeekday(i.now);
  const perDay = Math.ceil((i.weeklyTarget - i.sentNewThisWeek) / daysLeft);
  return Math.max(0, Math.min(perDay, i.channelRemaining));
}

export const FINDING_POLICIES = ["script", "conferido"] as const;
export type FindingPolicy = (typeof FINDING_POLICIES)[number];

/**
 * O achado válido mais recente, ou null.
 * `script`: medido nas últimas 24 h, por script ou à mão.
 * `conferido`: conferido no navegador hoje (tipo de achado que já errou por script).
 */
export function validFinding<F extends { origin: string; verifiedAt: Date }>(
  policy: FindingPolicy,
  findings: F[],
  now: Date,
): F | null {
  const ok = (f: F) =>
    policy === "script"
      ? now.getTime() - f.verifiedAt.getTime() <= DAY_MS
      : f.origin === "conferido" && spDay(f.verifiedAt) === spDay(now);
  return (
    findings
      .filter((f) => f.verifiedAt <= now && ok(f))
      .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime())[0] ?? null
  );
}

export type MessageVars = {
  nome: string;
  achado: string;
  /** Algo da própria empresa, citado: é o que abre a mensagem. */
  gancho?: string | null;
  /** Quem perde naquele caso, pelo lado do cliente da empresa. */
  cliente?: string | null;
};
const VAR_KEYS = ["nome", "achado", "gancho", "cliente"] as const;

export function renderMessage(template: string, v: MessageVars): string {
  // Função no lugar do texto: "$&" e "$$" dentro de um achado ("R$ 10") seriam interpretados.
  return VAR_KEYS.reduce((out, k) => out.replaceAll(`{${k}}`, () => v[k] ?? ""), template);
}

/** Partes que o texto pede e o achado não tem: com alguma faltando, a mensagem sairia genérica. */
export function missingVars(template: string, v: MessageVars): string[] {
  return VAR_KEYS.filter((k) => template.includes(`{${k}}`) && !(v[k] ?? "").trim());
}

/** Número de WhatsApp com DDI, ou null quando o campo não é um número só (ramal, dois números). */
export function whatsappNumber(raw: string | null | undefined): string | null {
  const digits = (normalizePhone(raw) ?? "").replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

/** Link que abre a conversa. WhatsApp leva o texto; o Instagram não aceita texto no link. */
export function contactLink(
  channel: Channel,
  lead: { whatsapp: string | null; phone: string | null; instagram: string | null },
  message: string,
): string | null {
  if (channel === "whatsapp") {
    const full = whatsappNumber(lead.whatsapp) ?? whatsappNumber(lead.phone);
    if (!full) return null;
    return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
  }
  if (channel === "instagram") {
    const handle = normalizeInstagram(lead.instagram);
    return handle ? `https://ig.me/m/${handle}` : null;
  }
  return null;
}

/** Quanto falta para o próximo envio no canal (0 = liberado). */
export function gapWaitMs(channel: Channel, lastSentAt: Date | null, now: Date): number {
  if (!lastSentAt) return 0;
  const gap = (channel === "whatsapp" ? 3 : 2) * 60_000;
  return Math.max(0, gap - (now.getTime() - lastSentAt.getTime()));
}

export type QLead = {
  id: string;
  name: string;
  stage: Stage;
  whatsapp: string | null;
  phone: string | null;
  instagram: string | null;
  followers: number | null;
  engagementPct: number | null;
  signals: Record<string, unknown>;
  createdAt: Date;
};
export type QFinding = {
  leadId: string;
  summary: string;
  origin: string;
  verifiedAt: Date;
  evidenceUrl: string;
  hook: string | null;
  customerSide: string | null;
  hookBy?: string | null;
};
export type QContact = {
  id: string;
  leadId: string;
  channel: string;
  sentAt: Date;
  isFollowUp: boolean;
  repliedAt: Date | null;
};
export type QFront = {
  channel: Channel;
  dailyLimit: number;
  weeklyTarget: number;
  findingPolicy: FindingPolicy;
  messageTemplate: string | null;
  followUpTemplate: string | null;
  usesEngagement: boolean;
  engagementMin: number | null;
};
export type QItem = { lead: QLead; finding: QFinding | null; message: string; link: string };
export type Queue = {
  quota: number;
  sentToday: number;
  waitMs: number;
  novos: QItem[];
  followUps: QItem[];
  replied: QLead[];
  excluded: {
    semTexto: boolean;
    vencidos: QLead[];
    /** Achado válido, mas sem gancho ou lado do cliente que o texto da frente pede. */
    semGancho: QLead[];
    semContato: number;
    semEngajamento: number;
  };
};

const FOLLOW_UP_BUSINESS_DAYS = 3;
const NEW_STAGES: Stage[] = ["importado", "qualificado", "aprovado"];

/**
 * Monta a fila de uma frente.
 * `contacts` são os contatos dos leads da frente; `channelContacts` são todos os
 * envios do canal desde o começo da semana (de qualquer frente), porque o limite
 * diário e o intervalo são do canal, não da frente.
 */
export function selectQueue(i: {
  front: QFront;
  leads: QLead[];
  findings: QFinding[];
  contacts: QContact[];
  channelContacts: { sentAt: Date }[];
  now: Date;
}): Queue {
  const { front, now } = i;
  const today = spDay(now);
  const group = <T extends { leadId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.leadId, [...(m.get(r.leadId) ?? []), r]);
    return m;
  };
  // Achado vetado pela IA não sustenta mensagem: não conta como achado na fila.
  const findingsOf = group(i.findings.filter((f) => f.hookBy !== "vetado"));
  const contactsOf = group(i.contacts);

  const sentToday = i.channelContacts.filter((c) => spDay(c.sentAt) === today).length;
  let channelRemaining = Math.max(0, front.dailyLimit - sentToday);
  const lastSent = i.channelContacts.reduce<Date | null>(
    (max, c) => (!max || c.sentAt > max ? c.sentAt : max),
    null,
  );

  const vars = (lead: QLead, finding: QFinding | null): MessageVars => ({
    nome: lead.name,
    achado: finding?.summary ?? "",
    gancho: finding?.hook,
    cliente: finding?.customerSide,
  });
  const item = (lead: QLead, template: string, finding: QFinding | null): QItem | null => {
    if (missingVars(template, vars(lead, finding)).length > 0) return null;
    const message = renderMessage(template, vars(lead, finding));
    const link = contactLink(front.channel, lead, message);
    return link ? { lead, finding, message, link } : null;
  };
  const latest = (leadId: string) =>
    [...(findingsOf.get(leadId) ?? [])].sort(
      (a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime(),
    )[0] ?? null;

  // Follow-ups primeiro: já venceram e disputam a mesma vaga diária do canal.
  const followUps: QItem[] = [];
  if (front.followUpTemplate) {
    for (const lead of i.leads) {
      if (followUps.length >= channelRemaining) break;
      const cs = contactsOf.get(lead.id) ?? [];
      const due =
        lead.stage === "contatado" &&
        cs.length === 1 &&
        !cs[0].repliedAt &&
        businessDaysBetween(cs[0].sentAt, now) >= FOLLOW_UP_BUSINESS_DAYS;
      const it = due ? item(lead, front.followUpTemplate, latest(lead.id)) : null;
      if (it) followUps.push(it);
    }
  }
  channelRemaining -= followUps.length;

  const start = weekStart(now);
  const sentNewThisWeek = i.contacts.filter((c) => !c.isFollowUp && c.sentAt >= start).length;
  const quota = dailyQuota({
    weeklyTarget: front.weeklyTarget,
    sentNewThisWeek,
    channelRemaining,
    now,
  });

  const excluded: Queue["excluded"] = {
    semTexto: !front.messageTemplate,
    vencidos: [],
    semGancho: [],
    semContato: 0,
    semEngajamento: 0,
  };
  const eligible: QItem[] = [];
  if (front.messageTemplate) {
    for (const lead of i.leads) {
      if (!NEW_STAGES.includes(lead.stage)) continue;
      if ((contactsOf.get(lead.id) ?? []).length > 0) continue;
      if (lead.signals.pulado_em === today) continue;
      if (!contactLink(front.channel, lead, "")) {
        excluded.semContato++;
        continue;
      }
      if (front.usesEngagement) {
        const v = checkEngagement({
          followers: lead.followers,
          engagement: lead.engagementPct,
          frontMin: front.engagementMin,
        });
        if (!v.ok) {
          excluded.semEngajamento++;
          continue;
        }
      }
      const finding = validFinding(front.findingPolicy, findingsOf.get(lead.id) ?? [], now);
      if (!finding) {
        excluded.vencidos.push(lead);
        continue;
      }
      const it = item(lead, front.messageTemplate, finding);
      if (it) eligible.push(it);
      else excluded.semGancho.push(lead);
    }
  }
  const score = (l: QLead) => Number(l.signals.score) || 0;
  eligible.sort(
    (a, b) =>
      score(b.lead) - score(a.lead) || a.lead.createdAt.getTime() - b.lead.createdAt.getTime(),
  );

  return {
    quota,
    sentToday,
    waitMs: gapWaitMs(front.channel, lastSent, now),
    novos: eligible.slice(0, quota),
    followUps,
    replied: i.leads.filter((l) => l.stage === "respondeu"),
    excluded,
  };
}
