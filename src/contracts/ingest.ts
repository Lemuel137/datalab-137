import { z } from "zod";
import { FINDING_KINDS } from "@/contracts/finding";

/**
 * Corpo da porta de entrada de leads (POST /api/ingest/leads).
 * É genérica por frente: serve ao Captor (delivery) e a qualquer outra fonte.
 */
const opt = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

const findingIn = z
  .object({
    summary: z.string().trim().min(10).max(500),
    evidenceUrl: z.url(),
    // Data da medição, nunca no futuro (com folga de 5 min para relógio fora de hora).
    verifiedAt: z.coerce.date().refine((d) => d.getTime() <= Date.now() + 5 * 60_000, {
      message: "Data da medição no futuro.",
    }),
    kind: z.enum(FINDING_KINDS).default("outro"),
    hook: opt,
    customerSide: opt,
    hookBy: z.enum(["ia", "manual"]).nullish(),
  })
  .refine((f) => !(f.hook || f.customerSide) || Boolean(f.hookBy), {
    message: "Gancho ou lado do cliente exigem hookBy (ia ou manual).",
  });

const leadIn = z
  .object({
    name: z.string().trim().min(2).max(200),
    whatsapp: opt,
    phone: opt,
    instagram: opt,
    city: opt,
    uf: opt,
    sourceUrl: z.url().nullish(),
    signals: z.record(z.string(), z.unknown()).default({}),
    findings: z.array(findingIn).max(5).default([]),
  })
  .refine((l) => Boolean(l.whatsapp || l.phone || l.instagram), {
    message: "Lead sem WhatsApp, telefone ou Instagram não pode ser abordado.",
  });

export const ingestSchema = z.object({
  front: z.string().regex(/^[a-z0-9-]{2,40}$/),
  leads: z.array(leadIn).min(1).max(300),
});

export type IngestPayload = z.infer<typeof ingestSchema>;
export type IngestLead = IngestPayload["leads"][number];

/** Limeira fica fora da prospecção (regra do Lemuel). "Limeira do Oeste" é outra cidade. */
export function isBlockedCity(city: string | null | undefined): boolean {
  const c = (city ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[/\-,]/)[0]
    .trim();
  return c === "limeira";
}

type Existing = { id: string; kind: string; summary: string };
export type FindingMerge =
  { action: "touch"; id: string } | { action: "replace"; removeIds: string[] };

/**
 * O que fazer com um achado de script que chegou de novo.
 * Mesma medição (tipo e texto): só a data avança, e o gancho já escrito fica.
 * Medição diferente: os achados de script do mesmo tipo saem, levando o gancho velho junto.
 */
export function mergeFinding(
  existing: Existing[],
  incoming: { kind: string; summary: string },
): FindingMerge {
  const key = (s: string) => s.trim().toLowerCase();
  const sameKind = existing.filter((e) => e.kind === incoming.kind);
  const same = sameKind.find((e) => key(e.summary) === key(incoming.summary));
  return same
    ? { action: "touch", id: same.id }
    : { action: "replace", removeIds: sameKind.map((e) => e.id) };
}
