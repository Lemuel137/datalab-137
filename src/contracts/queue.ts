/**
 * Regras da fila do dia. Tudo aqui é puro: recebe linhas e a hora, devolve a fila.
 * "Dia" e "semana" são sempre de Brasília, porque o servidor roda em UTC.
 */
import type { Channel } from "@/contracts/funnel";
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

export function renderMessage(template: string, v: { nome: string; achado: string }): string {
  return template.replaceAll("{nome}", v.nome).replaceAll("{achado}", v.achado);
}

/** Link que abre a conversa. WhatsApp leva o texto; o Instagram não aceita texto no link. */
export function contactLink(
  channel: Channel,
  lead: { whatsapp: string | null; phone: string | null; instagram: string | null },
  message: string,
): string | null {
  if (channel === "whatsapp") {
    const digits = normalizePhone(lead.whatsapp) ?? normalizePhone(lead.phone);
    if (!digits) return null;
    // 10 ou 11 dígitos é número nacional sem o DDI.
    const full = digits.length <= 11 ? `55${digits}` : digits;
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
