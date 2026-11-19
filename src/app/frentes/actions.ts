"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fronts } from "@/db/schema";
import { frontEditSchema } from "@/contracts/front";
import type { LeadActionState } from "@/contracts/journey";

export async function saveFront(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const parsed = frontEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { id, ...values } = parsed.data;
  const rows = await db.update(fronts).set(values).where(eq(fronts.id, id)).returning({
    id: fronts.id,
  });
  if (rows.length === 0) return { ok: false, message: "Frente não encontrada." };

  revalidatePath("/frentes");
  revalidatePath("/fila");
  return { ok: true, message: "Frente salva." };
}
