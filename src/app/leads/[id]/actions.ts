"use server";

import { revalidatePath } from "next/cache";
import { createFinding } from "@/domains/leads/findings";
import type { FindingFormState } from "@/contracts/finding";

export async function addFinding(
  _prev: FindingFormState,
  formData: FormData,
): Promise<FindingFormState> {
  const result = await createFinding({
    leadId: formData.get("leadId"),
    summary: formData.get("summary"),
    evidenceUrl: formData.get("evidenceUrl"),
    confidence: formData.get("confidence"),
  });

  if (result.ok) revalidatePath(`/leads/${String(formData.get("leadId"))}`);
  return result;
}
