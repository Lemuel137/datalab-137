import "server-only";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { briefings } from "@/db/schema";
import { TOKEN_RE, type BriefingAnswers } from "@/contracts/briefing";

export type Briefing = typeof briefings.$inferSelect;

export async function createBriefing(title: string): Promise<Briefing> {
  // 24 bytes aleatórios = 32 caracteres: o endereço é a única chave de quem responde.
  const token = randomBytes(24).toString("base64url");
  const [row] = await db.insert(briefings).values({ title, token }).returning();
  return row;
}

export async function listBriefings(): Promise<Briefing[]> {
  return db.select().from(briefings).orderBy(desc(briefings.createdAt));
}

export async function briefingByToken(token: string): Promise<Briefing | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [row] = await db.select().from(briefings).where(eq(briefings.token, token)).limit(1);
  return row ?? null;
}

/** Salva o rascunho ou envia. Depois de enviado, só o Lemuel reabre. */
export async function saveBriefing(token: string, answers: BriefingAnswers, submit: boolean) {
  const b = await briefingByToken(token);
  if (!b) return { ok: false as const, status: 404, message: "Briefing não encontrado." };
  if (b.submittedAt) {
    return { ok: false as const, status: 409, message: "Este briefing já foi enviado." };
  }
  const now = new Date();
  await db
    .update(briefings)
    .set({ answers, updatedAt: now, submittedAt: submit ? now : null })
    .where(eq(briefings.id, b.id));
  return {
    ok: true as const,
    status: 200,
    message: submit ? "Briefing enviado." : "Rascunho salvo.",
  };
}

export async function reopenBriefing(id: string) {
  await db.update(briefings).set({ submittedAt: null }).where(eq(briefings.id, id));
}
