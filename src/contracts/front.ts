import { z } from "zod";
import { FINDING_POLICIES } from "@/contracts/queue";

const text = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

/** Edição de uma frente pela tela /frentes (valores chegam como texto do formulário). */
export const frontEditSchema = z.object({
  id: z.uuid(),
  dailyLimit: z.coerce.number().int().min(1).max(50),
  weeklyTarget: z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .refine((n) => n % 5 === 0, "Leads por semana: escolha de 5 em 5."),
  findingPolicy: z.enum(FINDING_POLICIES),
  messageTemplate: text,
  followUpTemplate: text,
  active: z
    .union([z.literal("on"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => v === "on"),
});

export type FrontEdit = z.infer<typeof frontEditSchema>;
