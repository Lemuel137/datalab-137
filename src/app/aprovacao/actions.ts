"use server";

import { revalidatePath } from "next/cache";
import { outreachFormSchema, type OutreachState } from "@/contracts/outreach";
import { approveToday } from "@/domains/outreach/approve";

export async function approve(_prev: OutreachState, formData: FormData): Promise<OutreachState> {
  const parsed = outreachFormSchema.safeParse({
    channel: formData.get("channel"),
    requested: formData.get("requested"),
  });

  if (!parsed.success) {
    return { ok: false, aprovados: 0, message: parsed.error.issues[0].message };
  }

  const result = await approveToday(parsed.data.channel, parsed.data.requested);
  if (result.ok) {
    revalidatePath("/aprovacao");
    revalidatePath("/leads");
  }
  return { ok: result.ok, aprovados: result.aprovados, message: result.message };
}
