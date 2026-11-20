import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, findings, fronts, leads } from "@/db/schema";
import type { Channel, Stage } from "@/contracts/funnel";
import {
  businessDaysBetween,
  renderMessage,
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
  /** Texto que a pessoa ajustou na fila antes de enviar; vazio usa o texto montado. */
  edited?: string,
): Promise<ActionResult> {
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId)).for("update");
    if (!lead) return { ok: false, message: "Lead não encontrado." };
    const [front] = await tx.select().from(fronts).where(eq(fronts.id, lead.frontId)).limit(1);
    if (!front) return { ok: false, message: "Frente não encontrada." };

    // Limite diário e intervalo são do canal: sem esta trava, dois leads diferentes
    // registrados ao mesmo tempo não enxergam o envio um do outro.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${front.channel}))`);

    const mine = await tx.select().from(contacts).where(eq(contacts.leadId, leadId));
    if (kind === "first" && mine.length > 0) {
      return { ok: false, message: "Este lead já tem envio registrado." };
    }
    if (kind === "followup") {
      if (mine.length === 0) return { ok: false, message: "Ainda não há primeiro envio." };
      if (mine.some((c) => c.isFollowUp)) {
        return { ok: false, message: "O follow-up único já foi enviado. Não insistir." };
      }
      if (businessDaysBetween(mine[0].sentAt, now) < 3) {
        return { ok: false, message: "Follow-up só depois de 3 dias úteis do primeiro envio." };
      }
      if (mine.some((c) => c.repliedAt)) {
        return { ok: false, message: "Este lead já respondeu; não cabe follow-up." };
      }
    }

    const queue = await loadQueue(tx, front, now);
    if (queue.waitMs > 0) {
      const s = Math.ceil(queue.waitMs / 1000);
      return { ok: false, message: `Aguarde ${s}s: intervalo mínimo entre envios do canal.` };
    }
    const item = (kind === "first" ? queue.novos : queue.followUps).find(
      (it) => it.lead.id === leadId,
    );
    if (kind === "first" && item?.needsCheck) {
      return { ok: false, message: "Confira a evidência do achado antes de registrar o envio." };
    }
    // Fora da fila (achado venceu ou limite estourou depois de abrir a conversa): o envio
    // já aconteceu à mão, então grava mesmo assim. Recusar criaria uma segunda "primeira mensagem".
    let message = edited?.trim() || item?.message;
    if (!message) {
      const [f] = await tx
        .select()
        .from(findings)
        .where(eq(findings.leadId, leadId))
        .orderBy(desc(findings.verifiedAt))
        .limit(1);
      const template =
        kind === "followup"
          ? front.followUpTemplate
          : front.templatesByKind[f?.kind ?? ""] || front.messageTemplate;
      message = template
        ? renderMessage(template, {
            nome: lead.name,
            achado: f?.summary ?? "",
            gancho: f?.hook,
            cliente: f?.customerSide,
          })
        : "(texto não registrado)";
    }

    await tx.insert(contacts).values({
      leadId,
      channel: front.channel,
      message,
      isFollowUp: kind === "followup",
      sentAt: now,
    });
    if (kind === "first") {
      await tx
        .update(leads)
        .set({ stage: "contatado", updatedAt: now })
        .where(eq(leads.id, leadId));
    }
    const done = kind === "first" ? "Envio registrado" : "Follow-up registrado";
    return {
      ok: true,
      message: item
        ? `${done}.`
        : `${done}, mas fora da fila de hoje (achado vencido ou limite do canal). Confira o lead.`,
    };
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
