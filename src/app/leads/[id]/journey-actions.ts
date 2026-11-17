"use server";

import { revalidatePath } from "next/cache";
import { changeStage, registerContact, registerReply } from "@/domains/leads/journey";
import { contactFormSchema, replyFormSchema, stageChangeSchema } from "@/contracts/journey";
import type { LeadActionState } from "@/contracts/journey";

function refresh(leadId: string) {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/aprovacao");
}

export async function setStage(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = stageChangeSchema.safeParse({
    leadId: formData.get("leadId"),
    to: formData.get("to"),
  });
  if (!parsed.success) return { ok: false, message: "Etapa inválida." };

  const result = await changeStage(parsed.data.leadId, parsed.data.to);
  if (result.ok) refresh(parsed.data.leadId);
  return result;
}

export async function addContact(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = contactFormSchema.safeParse({
    leadId: formData.get("leadId"),
    channel: formData.get("channel"),
    message: formData.get("message"),
    isFollowUp: formData.get("isFollowUp"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const result = await registerContact(parsed.data);
  if (result.ok) refresh(parsed.data.leadId);
  return result;
}

export async function addReply(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const leadId = String(formData.get("leadId") ?? "");
  const parsed = replyFormSchema.safeParse({
    contactId: formData.get("contactId"),
    replyKind: formData.get("replyKind"),
  });
  if (!parsed.success) return { ok: false, message: "Resposta inválida." };

  const result = await registerReply(parsed.data.contactId, parsed.data.replyKind);
  if (result.ok && leadId) refresh(leadId);
  return result;
}
