"use server";

import { revalidatePath } from "next/cache";
import { createFinding, reconfirmFinding } from "@/domains/leads/findings";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import type { FindingFormState } from "@/contracts/finding";
import { noteSchema } from "@/contracts/journey";

export async function addFinding(
  _prev: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const result = await createFinding({
    leadId: formData.get("leadId"),
    summary: formData.get("summary"),
    evidenceUrl: formData.get("evidenceUrl"),
    confidence: formData.get("confidence"),
    kind: formData.get("kind") ?? undefined,
    origin: formData.get("origin") ?? undefined,
    hook: formData.get("hook"),
    customerSide: formData.get("customerSide"),
  });

  if (result.ok) revalidatePath(`/leads/${String(formData.get("leadId"))}`);
  return result;
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const metricsSchema = z.object({
  leadId: z.uuid(),
  followers: z.preprocess(blank, z.coerce.number().int().nonnegative().nullable()),
  // Aceita vírgula decimal, como o Lemuel digita.
  engagementPct: z.preprocess(
    (v) => blank(typeof v === "string" ? v.replace(",", ".") : v),
    z.coerce.number().min(0).max(100).nullable(),
  ),
});

export async function setMetrics(
  _prev: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const parsed = metricsSchema.safeParse({
    leadId: formData.get("leadId"),
    followers: formData.get("followers"),
    engagementPct: formData.get("engagementPct"),
  });
  if (!parsed.success) return { ok: false, message: "Seguidores ou engajamento inválido." };

  await db
    .update(leads)
    .set({
      followers: parsed.data.followers,
      engagementPct: parsed.data.engagementPct,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, parsed.data.leadId));

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return { ok: true, message: "Medição salva." };
}

export async function reconfirm(
  _prev: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const id = z.uuid().safeParse(formData.get("findingId"));
  if (!id.success) return { ok: false, message: "Achado inválido." };
  const r = await reconfirmFinding(id.data);
  if (r.ok) {
    revalidatePath(`/leads/${r.leadId}`);
    revalidatePath("/fila");
  }
  return { ok: r.ok, message: r.message };
}

export async function saveNote(
  _prev: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const parsed = noteSchema.safeParse({
    leadId: formData.get("leadId"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Observação longa demais (até 2.000 letras)." };

  await db
    .update(leads)
    .set({ note: parsed.data.note, updatedAt: new Date() })
    .where(eq(leads.id, parsed.data.leadId));

  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/fila");
  return { ok: true, message: parsed.data.note ? "Observação salva." : "Observação apagada." };
}
