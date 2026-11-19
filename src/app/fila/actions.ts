"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { markSent, skipToday } from "@/domains/outreach/queue";
import type { LeadActionState } from "@/contracts/journey";

const sentSchema = z.object({ leadId: z.uuid(), kind: z.enum(["first", "followup"]) });

function refresh(leadId: string) {
  revalidatePath("/fila");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function enviei(_prev: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const parsed = sentSchema.safeParse({
    leadId: formData.get("leadId"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) return { ok: false, message: "Pedido inválido." };
  const result = await markSent(parsed.data.leadId, parsed.data.kind);
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
