import "server-only";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { contacts, findings, leads } from "@/db/schema";
import { canAdvance, requiresFinding, type Channel, type Stage } from "@/contracts/funnel";

export type ActionResult = { ok: boolean; message: string };

async function hasFinding(leadId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: findings.id })
    .from(findings)
    .where(eq(findings.leadId, leadId))
    .limit(1);
  return Boolean(row);
}

export async function changeStage(leadId: string, to: Stage): Promise<ActionResult> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: "Lead não encontrado." };

  if (!canAdvance(lead.stage as Stage, to)) {
    return { ok: false, message: `Não é possível ir de "${lead.stage}" para "${to}".` };
  }

  if (requiresFinding(to) && !(await hasFinding(leadId))) {
    return { ok: false, message: "Registre ao menos um achado verificado antes desta etapa." };
  }

  await db.update(leads).set({ stage: to, updatedAt: new Date() }).where(eq(leads.id, leadId));
  return { ok: true, message: `Etapa alterada para "${to}".` };
}

export async function registerContact(input: {
  leadId: string;
  channel: Channel;
  message: string;
  isFollowUp: boolean;
}): Promise<ActionResult> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
  if (!lead) return { ok: false, message: "Lead não encontrado." };

  if (lead.stage !== "aprovado" && lead.stage !== "contatado") {
    return {
      ok: false,
      message: "O lead precisa estar aprovado ou já contatado para registrar envio.",
    };
  }

  const anteriores = await db
    .select({ id: contacts.id, isFollowUp: contacts.isFollowUp })
    .from(contacts)
    .where(eq(contacts.leadId, input.leadId));

  if (anteriores.length > 0 && input.isFollowUp === false) {
    return {
      ok: false,
      message: "Já existe um envio. O próximo só pode ser o follow-up único.",
    };
  }

  if (anteriores.some((c) => c.isFollowUp)) {
    return { ok: false, message: "O follow-up único já foi enviado. Não insistir." };
  }

  await db.insert(contacts).values({
    leadId: input.leadId,
    channel: input.channel,
    message: input.message,
    isFollowUp: input.isFollowUp,
    sentAt: new Date(),
  });

  if (lead.stage === "aprovado") {
    await db
      .update(leads)
      .set({ stage: "contatado", updatedAt: new Date() })
      .where(eq(leads.id, input.leadId));
  }

  return {
    ok: true,
    message: input.isFollowUp ? "Follow-up registrado." : "Envio registrado. Lead em contatado.",
  };
}

export async function registerReply(
  contactId: string,
  replyKind: "pessoa" | "robo" | "recusa" | "whatsapp",
): Promise<ActionResult> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return { ok: false, message: "Envio não encontrado." };
  if (contact.repliedAt) return { ok: false, message: "Este envio já tem resposta registrada." };

  await db
    .update(contacts)
    .set({ repliedAt: new Date(), replyKind })
    .where(eq(contacts.id, contactId));

  if (replyKind === "pessoa" || replyKind === "whatsapp") {
    const [lead] = await db.select().from(leads).where(eq(leads.id, contact.leadId)).limit(1);
    if (lead && lead.stage === "contatado") {
      await db
        .update(leads)
        .set({ stage: "respondeu", updatedAt: new Date() })
        .where(eq(leads.id, contact.leadId));
    }
  }

  return {
    ok: true,
    message:
      replyKind === "pessoa" || replyKind === "whatsapp"
        ? "Resposta de pessoa registrada."
        : "Resposta registrada sem mudar a etapa.",
  };
}

export async function contactHistory(leadId: string) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.leadId, leadId))
    .orderBy(desc(contacts.sentAt));
}

export async function lastSentInChannel(channel: Channel, since: Date) {
  const [row] = await db
    .select({ sentAt: contacts.sentAt })
    .from(contacts)
    .where(and(eq(contacts.channel, channel), gte(contacts.sentAt, since)))
    .orderBy(desc(contacts.sentAt))
    .limit(1);
  return row?.sentAt ?? null;
}
