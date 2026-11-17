import { z } from "zod";
import { CHANNELS } from "@/contracts/funnel";

export const outreachFormSchema = z.object({
  channel: z.enum(CHANNELS),
  requested: z.coerce.number().int().positive("O lote precisa de pelo menos 1 lead."),
});

export type OutreachState =
  | { ok: true; aprovados: number; message: string }
  | { ok: false; aprovados: number; message: string }
  | undefined;
