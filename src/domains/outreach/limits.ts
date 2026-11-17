import type { Channel } from "@/contracts/funnel";

export type SentToday = { channel: Channel; sentAt: Date }[];

export function sentTodayByChannel(sent: SentToday, now: Date): Record<string, number> {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const out: Record<string, number> = {};
  for (const s of sent) {
    const t = s.sentAt;
    if (t.getFullYear() === y && t.getMonth() === m && t.getDate() === d) {
      out[s.channel] = (out[s.channel] ?? 0) + 1;
    }
  }
  return out;
}

export type ApproveInput = {
  channel: Channel;
  dailyLimit: number;
  requested: number;
  sent: SentToday;
  now: Date;
  minGapMinutes: number;
  lastSentAt?: Date | null;
};

export type ApproveResult =
  { ok: true; allowed: number } | { ok: false; reason: string; allowed: number };

export function approveBatch(input: ApproveInput): ApproveResult {
  const used = sentTodayByChannel(input.sent, input.now)[input.channel] ?? 0;
  const remaining = Math.max(0, input.dailyLimit - used);

  if (remaining === 0) {
    return {
      ok: false,
      allowed: 0,
      reason: `Limite diário do canal ${input.channel} já atingido (${input.dailyLimit}).`,
    };
  }

  if (input.requested > remaining) {
    return {
      ok: false,
      allowed: remaining,
      reason: `Lote de ${input.requested} excede o restante do dia (${remaining} de ${input.dailyLimit}).`,
    };
  }

  if (input.lastSentAt) {
    const gapMs = input.now.getTime() - input.lastSentAt.getTime();
    if (gapMs < input.minGapMinutes * 60_000) {
      return {
        ok: false,
        allowed: 0,
        reason: `Intervalo mínimo de ${input.minGapMinutes} min entre envios não respeitado.`,
      };
    }
  }

  return { ok: true, allowed: input.requested };
}
