/**
 * Regras da fila do dia. Tudo aqui é puro: recebe linhas e a hora, devolve a fila.
 * "Dia" e "semana" são sempre de Brasília, porque o servidor roda em UTC.
 */

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
