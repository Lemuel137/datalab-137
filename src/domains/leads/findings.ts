import "server-only";
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
  });

  return { ok: true as const, message: "Achado registrado." };
}
