import { z } from "zod";

export const findingFormSchema = z.object({
  leadId: z.uuid(),
  summary: z.string().trim().min(10, "Descreva o achado em pelo menos 10 caracteres."),
  evidenceUrl: z.url("Informe a URL onde o achado foi verificado."),
  confidence: z.enum(["alta", "media", "baixa"]),
});

export type FindingFormState = { ok: boolean; message: string } | undefined;
