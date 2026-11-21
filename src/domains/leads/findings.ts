import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { findings } from "@/db/schema";
import { capConfidence, findingFormSchema } from "@/contracts/finding";

export async function createFinding(input: unknown) {
  const parsed = findingFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0].message };
  }

  await db.insert(findings).values({
    leadId: parsed.data.leadId,
    summary: parsed.data.summary,
    evidenceUrl: parsed.data.evidenceUrl,
    verifiedAt: new Date(),
    confidence: capConfidence(parsed.data.origin, parsed.data.confidence),
    kind: parsed.data.kind,
    origin: parsed.data.origin,
    hook: parsed.data.hook,
    customerSide: parsed.data.customerSide,
  });

  return { ok: true as const, message: "Achado registrado." };
}

/**
 * Marca que o achado foi conferido de novo no navegador agora.
 * Só vale para achado conferido: medição de script é refeita pelo script.
 */
export async function reconfirmFinding(findingId: string, now = new Date()) {
  const rows = await db
    .update(findings)
    .set({ verifiedAt: now, confirmedAt: now })
    .where(and(eq(findings.id, findingId), eq(findings.origin, "conferido")))
    .returning({ leadId: findings.leadId });
  return rows.length
    ? { ok: true as const, message: "Achado reconferido hoje.", leadId: rows[0].leadId }
    : { ok: false as const, message: "Achado não encontrado ou medido por script." };
}

/** Registra que a evidência do achado foi conferida no navegador agora (libera o envio na fila). */
export async function confirmFinding(findingId: string, now = new Date()) {
  const rows = await db
    .update(findings)
    .set({ confirmedAt: now })
    .where(eq(findings.id, findingId))
    .returning({ leadId: findings.leadId });
  return rows.length
    ? { ok: true as const, message: "Conferido. Envio liberado para hoje." }
    : { ok: false as const, message: "Achado não encontrado." };
}
