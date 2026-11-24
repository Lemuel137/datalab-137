import { z } from "zod";
import { CHANNELS, STAGES } from "@/contracts/funnel";

export const stageChangeSchema = z.object({
  leadId: z.uuid(),
  to: z.enum(STAGES),
});

export const contactFormSchema = z.object({
  leadId: z.uuid(),
  channel: z.enum(CHANNELS),
  message: z.string().trim().min(5, "Cole o texto enviado."),
  isFollowUp: z
    .union([z.literal("on"), z.literal(""), z.null(), z.undefined()])
    .transform((v) => v === "on"),
});

export const replyFormSchema = z.object({
  contactId: z.uuid(),
  replyKind: z.enum(["pessoa", "robo", "recusa", "whatsapp"]),
  // O que o lead escreveu, colado como veio: é a base da segunda mensagem.
  replyText: z
    .string()
    .trim()
    .max(4000)
    .nullish()
    .transform((v) => v || null),
});

export type LeadActionState = { ok: boolean; message: string } | undefined;

/** Anotação livre do lead (ex.: "este número é robô; ligar no fixo"). Vazio apaga. */
export const noteSchema = z.object({
  leadId: z.uuid(),
  note: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
});
