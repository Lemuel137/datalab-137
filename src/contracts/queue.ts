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
/**
 * Por quanto tempo uma medição de script vale, por tipo de achado.
 * Cardápio muda de um dia para o outro; avaliação no Google fica semanas no ar,
 * e relê-la custa crédito, então vale 7 dias.
 */
const SCRIPT_VALID_HOURS: Record<string, number> = {
  avaliacao_sem_resposta: 7 * 24,
  // A data de início de um anúncio não muda; o que muda é entrar anúncio novo, e isso a
  // conferência obrigatória pega. Vale 14 dias a partir da coleta.
  anuncio_parado: 14 * 24,
};
const DEFAULT_SCRIPT_VALID_HOURS = 24;

/** Quando há mais de um achado válido, qual abre a mensagem. Quem não está na lista vai depois. */
// Achado sobre o anúncio vem primeiro: é o assunto do que a agência vende.
const KIND_PRIORITY = [
  "destino_anuncio",
  "anuncio_parado",
  "avaliacao_sem_resposta",
  "cardapio_fraco",
];
const kindRank = (kind: string | undefined) => {
  const i = KIND_PRIORITY.indexOf(kind ?? "");
  return i === -1 ? KIND_PRIORITY.length : i;
};

/**
 * Os achados válidos, do mais forte ao mais fraco (prioridade do tipo, depois o mais recente).
 * `script`: medido dentro da validade do tipo, por script ou à mão.
 * `conferido`: conferido no navegador hoje (tipo de achado que já errou por script).
 */
export function validFindings<F extends { origin: string; verifiedAt: Date; kind?: string }>(
  policy: FindingPolicy,
  findings: F[],
  now: Date,
): F[] {
  const ok = (f: F) =>
    policy === "script"
      ? now.getTime() - f.verifiedAt.getTime() <=
        (SCRIPT_VALID_HOURS[f.kind ?? ""] ?? DEFAULT_SCRIPT_VALID_HOURS) * 3600_000
      : f.origin === "conferido" && spDay(f.verifiedAt) === spDay(now);
  return findings
    .filter((f) => f.verifiedAt <= now && ok(f))
    .sort(
      (a, b) =>
        kindRank(a.kind) - kindRank(b.kind) || b.verifiedAt.getTime() - a.verifiedAt.getTime(),
    );
}

/** O achado válido mais forte, ou null. */
export function validFinding<F extends { origin: string; verifiedAt: Date; kind?: string }>(
  policy: FindingPolicy,
  findings: F[],
  now: Date,
): F | null {
  return validFindings(policy, findings, now)[0] ?? null;
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
  kind?: string;
  hook: string | null;
  customerSide: string | null;
  hookBy?: string | null;
  /** Quando o Lemuel conferiu a evidência no navegador (tipos que exigem conferência). */
  confirmedAt?: Date | null;
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
  /** Texto próprio por tipo de achado; quem não tem usa `messageTemplate`. */
  templatesByKind?: Record<string, string>;
  followUpTemplate: string | null;
  usesEngagement: boolean;
  engagementMin: number | null;
};
export type QItem = {
  lead: QLead;
  finding: QFinding | null;
  message: string;
  link: string;
  /** O achado é de um tipo que exige conferência e ainda não foi conferido hoje. */
  needsCheck: boolean;
};

/**
 * Todo achado é conferido no navegador antes de cada envio, mesmo medido por
 * script: o fato pode ter mudado depois da medição. Aqui, o que olhar em cada tipo.
 */
const CHECK_INSTRUCTION: Record<string, string> = {
  avaliacao_sem_resposta:
    "Abra as avaliações e confirme que as reclamações continuam sem resposta.",
  // O Captor baixa uma amostra dos anúncios de cada página, não todos.
  anuncio_parado:
    "Abra a Biblioteca de Anúncios e confirme que não há anúncio mais novo que a data do achado.",
  cardapio_fraco: "Abra o cardápio e confirme que os itens citados continuam como o achado diz.",
};
const CHECK_DEFAULT = "Abra a evidência e confirme que o achado continua valendo.";

/** O que conferir antes de enviar. */
export function checkInstruction(kind: string | undefined): string {
  return CHECK_INSTRUCTION[kind ?? ""] ?? CHECK_DEFAULT;
}

export function needsCheck(
  finding: { kind?: string; confirmedAt?: Date | null } | null,
  now: Date,
): boolean {
  if (!finding) return false;
  return !finding.confirmedAt || spDay(finding.confirmedAt) !== spDay(now);
}
export type Queue = {
  quota: number;
  /** Primeiros contatos da frente desde segunda: o progresso da meta semanal. */
  sentNewThisWeek: number;
  sentToday: number;
  waitMs: number;
  novos: QItem[];
  followUps: QItem[];
  replied: QLead[];
  excluded: {
    semTexto: boolean;
    vencidos: QLead[];
    /** Achado válido, mas ainda sem a revisão da IA ou sem uma parte que o texto pede. */
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
    return link ? { lead, finding, message, link, needsCheck: needsCheck(finding, now) } : null;
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
      // Conferência é do achado; o follow-up não afirma achado.
      if (it) followUps.push({ ...it, needsCheck: false });
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

  const byKind = front.templatesByKind ?? {};
  const templateFor = (f: QFinding) => byKind[f.kind ?? ""] || front.messageTemplate;
  const hasTemplate = Boolean(front.messageTemplate) || Object.values(byKind).some(Boolean);

  const excluded: Queue["excluded"] = {
    semTexto: !hasTemplate,
    vencidos: [],
    semGancho: [],
    semContato: 0,
    semEngajamento: 0,
  };
  const eligible: QItem[] = [];
  if (hasTemplate) {
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
      const valid = validFindings(front.findingPolicy, findingsOf.get(lead.id) ?? [], now);
      if (valid.length === 0) {
        excluded.vencidos.push(lead);
        continue;
      }
      // O primeiro achado válido que tem texto para o tipo dele e todas as partes que o texto pede.
      let it: QItem | null = null;
      for (const finding of valid) {
        // Medido por script só vai à pessoa depois da revisão da IA (aprova ou veta).
        if (finding.origin === "script" && !finding.hookBy) continue;
        const template = templateFor(finding);
        it = template ? item(lead, template, finding) : null;
        if (it) break;
      }
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
    sentNewThisWeek,
    sentToday,
    waitMs: gapWaitMs(front.channel, lastSent, now),
    novos: eligible.slice(0, quota),
    followUps,
    replied: i.leads.filter((l) => l.stage === "respondeu"),
    excluded,
  };
}

export type CheckLink = { label: string; href: string };

const EVIDENCE_LABEL: Record<string, string> = {
  cardapio_fraco: "abrir cardápio",
  avaliacao_sem_resposta: "abrir avaliações",
  anuncio_parado: "ver anúncios ativos",
};

const isHttp = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//.test(v);

/**
 * Onde conferir um achado antes de enviar: a evidência medida, os anúncios
 * ativos da página e a página em si. Só entra endereço http e id numérico,
 * porque esses valores chegam de fora pela porta de entrada.
 */
export function checkLinks(
  finding: { kind?: string; evidenceUrl: string } | null,
  signals: Record<string, unknown>,
): CheckLink[] {
  const links: CheckLink[] = [];
  if (finding && isHttp(finding.evidenceUrl)) {
    links.push({
      label: EVIDENCE_LABEL[finding.kind ?? ""] ?? "abrir evidência",
      href: finding.evidenceUrl,
    });
  }
  const pageId = signals.pagina_id;
  if (typeof pageId === "string" && /^\d{5,20}$/.test(pageId)) {
    links.push({
      label: "ver anúncios ativos",
      href: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=${pageId}`,
    });
  }
  if (isHttp(signals.pagina_fb))
    links.push({ label: "página no Facebook", href: signals.pagina_fb });
  // A evidência do anúncio parado é a própria Biblioteca: não repete o mesmo endereço.
  return links.filter((l, i) => links.findIndex((x) => x.href === l.href) === i);
}
