import { z } from "zod";
import { FINDING_KINDS } from "@/contracts/finding";
import { FINDING_POLICIES } from "@/contracts/queue";

const text = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const TEMPLATE_FIELD = "template_";

/**
 * Edição de uma frente pela tela /frentes (valores chegam como texto do formulário).
 * Os textos por tipo de achado chegam em campos `template_<tipo>` e viram um mapa.
 */
export const frontEditSchema = z
  .object({
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
  })
  .catchall(z.unknown())
  .transform(
    ({
      id,
      dailyLimit,
      weeklyTarget,
      findingPolicy,
      messageTemplate,
      followUpTemplate,
      active,
      ...rest
    }) => {
      const templatesByKind: Record<string, string> = {};
      for (const kind of FINDING_KINDS) {
        const v = rest[`${TEMPLATE_FIELD}${kind}`];
        if (typeof v === "string" && v.trim() !== "")
          templatesByKind[kind] = v.trim().slice(0, 2000);
      }
      return {
        id,
        dailyLimit,
        weeklyTarget,
        findingPolicy,
        messageTemplate,
        followUpTemplate,
        active,
        templatesByKind,
      };
    },
  );

export type FrontEdit = z.infer<typeof frontEditSchema>;
