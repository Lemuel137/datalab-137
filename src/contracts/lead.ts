import { z } from "zod";
import { CHANNELS, STAGES } from "@/contracts/funnel";

const opt = (s: z.ZodString) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), s.optional());

// Célula vazia vira "não medido", não zero: zero reprovaria o lead por engajamento zerado.
const optNum = (s: z.ZodNumber) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().pipe(s).optional(),
  );

export const leadRowSchema = z.object({
  nome: z.string().min(1),
  categoria: opt(z.string()),
  nota: opt(z.string()),
  n_avaliacoes: z.coerce.number().int().nonnegative().optional(),
  google_ads: opt(z.string()),
  pixel_meta: opt(z.string()),
  ga4_gtm: opt(z.string()),
  site: opt(z.string()),
  instagram: opt(z.string()),
  telefone: opt(z.string()),
  whatsapp: opt(z.string()),
  maps: opt(z.string()),
  endereco: opt(z.string()),
  unidades: opt(z.string()),
  seguidores: optNum(z.number().int().nonnegative()),
  engajamento_pct: optNum(z.number().nonnegative()),
});

export const dossierSchema = z.object({
  nome: z.string().min(1),
  cid: z.string().optional(),
  nota: z.coerce.number().optional(),
  n_avaliacoes: z.coerce.number().int().optional(),
  categoria: z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  site_maps: z.string().optional(),
  site: z
    .object({
      url_final: z.string().optional(),
      tem_site: z.boolean().optional(),
      pixel_meta_id: z.array(z.string()).optional(),
      google_ads_id: z.array(z.string()).optional(),
      ga4_id: z.array(z.string()).optional(),
      gtm: z.array(z.string()).optional(),
      prova_social: z.boolean().optional(),
      formulario: z.boolean().optional(),
    })
    .partial()
    .optional(),
  avaliacoes: z
    .object({
      lidas: z.number().optional(),
      respondidas_pelo_dono: z.number().optional(),
      nota_media_recentes: z.number().optional(),
      reclamacoes_atendimento: z.array(z.unknown()).optional(),
    })
    .partial()
    .optional(),
});

export const contactSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(CHANNELS),
  message: z.string().min(1),
  isFollowUp: z.coerce.boolean().default(false),
});

export const stageSchema = z.object({
  leadId: z.string().uuid(),
  to: z.enum(STAGES),
});

export const findingSchema = z.object({
  leadId: z.string().uuid(),
  summary: z.string().min(1),
  evidenceUrl: z.url(),
  confidence: z.enum(["alta", "media", "baixa"]).default("media"),
});
