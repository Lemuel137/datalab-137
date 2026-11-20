"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createBriefing, reopenBriefing } from "@/domains/briefings/briefings";
import type { LeadActionState } from "@/contracts/journey";

export async function criar(_prev: LeadActionState, formData: FormData): Promise<LeadActionState> {
  const title = z.string().trim().min(2).max(120).safeParse(formData.get("title"));
  if (!title.success)
    return { ok: false, message: "Diga para quem é o briefing (2 a 120 letras)." };
  await createBriefing(title.data);
  revalidatePath("/briefings");
  return { ok: true, message: "Link criado. Copie e envie para a pessoa." };
}

export async function reabrir(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await reopenBriefing(id.data);
  revalidatePath("/briefings");
}
