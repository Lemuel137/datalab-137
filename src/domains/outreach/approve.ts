import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, fronts, leads } from "@/db/schema";
import { approveBatch } from "./limits";
import type { Channel } from "@/contracts/funnel";

export type BatchResult = {
  ok: boolean;
  aprovados: number;
  message: string;
};

export async function approveToday(channel: Channel, requested: number): Promise<BatchResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const frontList = await db.select().from(fronts).where(eq(fronts.channel, channel));
  if (frontList.length === 0) {
    return { ok: false, aprovados: 0, message: "Nenhuma frente usa esse canal." };
  }

  const limit = Math.max(...frontList.map((f) => f.dailyLimit));

  const sent = await db
    .select({ channel: contacts.channel, sentAt: contacts.sentAt })
    .from(contacts)
    .where(and(eq(contacts.channel, channel), gte(contacts.sentAt, today)));

  const [last] = await db
    .select({ sentAt: contacts.sentAt })
    .from(contacts)
    .where(eq(contacts.channel, channel))
    .orderBy(desc(contacts.sentAt))
    .limit(1);

  const result = approveBatch({
    channel,
    dailyLimit: limit,
    requested,
    sent: sent.map((s) => ({ channel: s.channel as Channel, sentAt: s.sentAt })),
    now: new Date(),
    minGapMinutes: channel === "whatsapp" ? 3 : 2,
    lastSentAt: last?.sentAt ?? null,
  });

  if (!result.ok) {
    return { ok: false, aprovados: 0, message: result.reason };
  }

  const candidatos = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.stage, "qualificado"),
        inArray(
          leads.frontId,
          frontList.map((f) => f.id),
        ),
      ),
    )
    .orderBy(leads.createdAt)
    .limit(requested);

  if (candidatos.length === 0) {
    return {
      ok: false,
      aprovados: 0,
      message: "Não há lead qualificado nesse canal para aprovar.",
    };
  }

  if (candidatos.length < requested) {
    return {
      ok: false,
      aprovados: 0,
      message: `Pedido de ${requested}, mas só há ${candidatos.length} lead(s) qualificado(s) nesse canal. Ajuste o lote.`,
    };
  }

  await db
    .update(leads)
    .set({ stage: "aprovado", updatedAt: new Date() })
    .where(
      inArray(
        leads.id,
        candidatos.map((c) => c.id),
      ),
    );

  return {
    ok: true,
    aprovados: candidatos.length,
    message: `${candidatos.length} lead(s) aprovado(s). Restam ${limit - sent.length - candidatos.length} no dia.`,
  };
}

export async function pendingQualified(channel: Channel) {
  const frontList = await db.select().from(fronts).where(eq(fronts.channel, channel));
  if (frontList.length === 0) return [];
  return db
    .select({ id: leads.id, name: leads.name })
    .from(leads)
    .where(
      and(
        eq(leads.stage, "qualificado"),
        inArray(
          leads.frontId,
          frontList.map((f) => f.id),
        ),
      ),
    );
}
