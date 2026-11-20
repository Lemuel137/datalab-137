"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { confirmFinding } from "@/domains/leads/findings";
import { markSent, skipToday } from "@/domains/outreach/queue";
import type { LeadActionState } from "@/contracts/journey";

const sentSchema = z.object({
  leadId: z.uuid(),
  kind: z.enum(["first", "followup"]),
  // Texto como ficou depois do ajuste à mão na fila.
  message: z.string().trim().min(5).max(2000),
});

function refresh(leadId: string) {
  revalidatePath("/fila");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function enviei(_prev: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const parsed = sentSchema.safeParse({
    leadId: formData.get("leadId"),
    kind: formData.get("kind"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { ok: false, message: "Texto vazio ou pedido inválido." };
  const result = await markSent(
    parsed.data.leadId,
    parsed.data.kind,
    new Date(),
    parsed.data.message,
  );
  if (result.ok) refresh(parsed.data.leadId);
  return result;
}

export async function pular(_prev: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const parsed = z.uuid().safeParse(formData.get("leadId"));
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };
  const result = await skipToday(parsed.data);
  if (result.ok) refresh(parsed.data);
  return result;
}

export async function conferi(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = z.uuid().safeParse(formData.get("findingId"));
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };
  const result = await confirmFinding(parsed.data);
  if (result.ok) revalidatePath("/fila");
  return result;
}
