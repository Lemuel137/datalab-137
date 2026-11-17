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
});

export type LeadActionState = { ok: boolean; message: string } | undefined;
