import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, findings, fronts, leads } from "@/db/schema";
import type { Channel, Stage } from "@/contracts/funnel";
import {
  selectQueue,
  spDay,
  weekStart,
  type FindingPolicy,
  type QFront,
  type Queue,
} from "@/contracts/queue";

export type ActionResult = { ok: boolean; message: string };
export type Front = typeof fronts.$inferSelect;

// A transação e o `db` têm os mesmos métodos de consulta.
type Executor = Pick<typeof db, "select" | "insert" | "update">;

async function loadQueue(ex: Executor, front: Front, now: Date): Promise<Queue> {
  const leadRows = await ex.select().from(leads).where(eq(leads.frontId, front.id));
  const ids = leadRows.map((l) => l.id);
  const [findingRows, contactRows] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          ex.select().from(findings).where(inArray(findings.leadId, ids)),
          ex.select().from(contacts).where(inArray(contacts.leadId, ids)),
        ]);
  // Limite diário e intervalo são do canal: contam os envios de todas as frentes.
  const channelContacts = await ex
    .select({ sentAt: contacts.sentAt })
    .from(contacts)
    .where(and(eq(contacts.channel, front.channel), gte(contacts.sentAt, weekStart(now))));

  const qFront: QFront = {
    ...front,
    channel: front.channel as Channel,
    findingPolicy: front.findingPolicy as FindingPolicy,
  };
  return selectQueue({
    front: qFront,
    leads: leadRows.map((l) => ({ ...l, stage: l.stage as Stage })),
    findings: findingRows,
    contacts: contactRows,
    channelContacts,
    now,
  });
}

export async function activeFronts(): Promise<Front[]> {
  return db.select().from(fronts).where(eq(fronts.active, true)).orderBy(fronts.name);
}

export async function buildQueue(
  frontSlug: string,
  now = new Date(),
): Promise<{ front: Front; queue: Queue } | null> {
  const [front] = await db.select().from(fronts).where(eq(fronts.slug, frontSlug)).limit(1);
  if (!front) return null;
  return { front, queue: await loadQueue(db, front, now) };
}

/**
 * Registra o envio que a pessoa acabou de fazer à mão.
 * Recalcula a fila dentro da transação, com o lead travado: clique duplo ou
 * aba antiga não gera contato em dobro nem fura limite e intervalo.
 */
export async function markSent(
  leadId: string,
  kind: "first" | "followup",
  now = new Date(),
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) return { ok: false, message: "Lead não encontrado." };
    const [front] = await tx.select().from(fronts).where(eq(fronts.id, lead.frontId)).limit(1);
    if (!front) return { ok: false, message: "Frente não encontrada." };

    const queue = await loadQueue(tx, front, now);
    if (queue.waitMs > 0) {
      const s = Math.ceil(queue.waitMs / 1000);
      return { ok: false, message: `Aguarde ${s}s: intervalo mínimo entre envios do canal.` };
    }
    const list = kind === "first" ? queue.novos : queue.followUps;
    const item = list.find((it) => it.lead.id === leadId);
    if (!item) {
      return {
        ok: false,
        message:
          kind === "first"
            ? "Este lead não está mais na fila de hoje (já contatado, achado vencido ou limite atingido)."
            : "Este follow-up não está mais na fila (já feito, respondido ou limite atingido).",
      };
    }

    await tx.insert(contacts).values({
      leadId,
      channel: front.channel,
      message: item.message,
      isFollowUp: kind === "followup",
      sentAt: now,
    });
    if (kind === "first") {
      await tx
        .update(leads)
        .set({ stage: "contatado", updatedAt: now })
        .where(eq(leads.id, leadId));
    }
    return { ok: true, message: kind === "first" ? "Envio registrado." : "Follow-up registrado." };
  });
}

/** Tira o lead da fila só hoje; amanhã ele volta. */
export async function skipToday(leadId: string, now = new Date()): Promise<ActionResult> {
  const patch = JSON.stringify({ pulado_em: spDay(now) });
  const rows = await db
    .update(leads)
    .set({ signals: sql`${leads.signals} || ${patch}::jsonb`, updatedAt: now })
    .where(eq(leads.id, leadId))
    .returning({ id: leads.id });
  return rows.length
    ? { ok: true, message: "Lead pulado hoje." }
    : { ok: false, message: "Lead não encontrado." };
}
