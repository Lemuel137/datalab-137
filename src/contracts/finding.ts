import { z } from "zod";

/**
 * Tipos de achado. Cada um nasce de uma medição concreta, não de opinião.
 * `outro` existe para não forçar encaixe, mas o resumo continua obrigatório.
 */
export const FINDING_KINDS = [
  "pixel_ausente",
  "destino_anuncio",
  "cardapio_fraco",
  "avaliacao_sem_resposta",
  "preco_inconsistente",
  "pagina_produto",
  "outro",
] as const;

export type FindingKind = (typeof FINDING_KINDS)[number];

export const FINDING_KIND_LABEL: Record<FindingKind, string> = {
  pixel_ausente: "Pixel ausente",
  destino_anuncio: "Destino do anúncio",
  cardapio_fraco: "Cardápio fraco",
  avaliacao_sem_resposta: "Avaliação sem resposta",
  preco_inconsistente: "Preço inconsistente",
  pagina_produto: "Página de produto",
  outro: "Outro",
};

/**
 * Origem do achado.
 * - `script`: veio de medição automática (ex.: "43% dos itens sem descrição").
 * - `conferido`: o Lemuel abriu a evidência no navegador e confirmou.
 *
 * Regra do Lemuel (19/11/2026): afirmação de DM é conferida no navegador antes
 * de enviar. Achado de script, sozinho, não libera aprovação.
 */
export const FINDING_ORIGINS = ["script", "conferido"] as const;

export type FindingOrigin = (typeof FINDING_ORIGINS)[number];

const optText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));

export const findingFormSchema = z.object({
  leadId: z.uuid(),
  summary: z.string().trim().min(10, "Descreva o achado em pelo menos 10 caracteres."),
  evidenceUrl: z.url("Informe a URL onde o achado foi verificado."),
  confidence: z.enum(["alta", "media", "baixa"]),
  kind: z.enum(FINDING_KINDS).default("outro"),
  origin: z.enum(FINDING_ORIGINS).default("conferido"),
  hook: optText,
  customerSide: optText,
});

export type FindingFormState = { ok: boolean; message: string } | undefined;

type FindingLike = { origin: string };

/** Só achado conferido conta para liberar "aprovado para abordagem". */
export function hasVerifiedFinding(list: FindingLike[]): boolean {
  return list.some((f) => f.origin === "conferido");
}

/**
 * Achado de script com confiança alta é contradição: o script mede, não
 * confere. Entra no máximo como "media" até alguém abrir a evidência.
 */
export function capConfidence(
  origin: FindingOrigin,
  confidence: "alta" | "media" | "baixa",
): "alta" | "media" | "baixa" {
  if (origin === "script" && confidence === "alta") return "media";
  return confidence;
}
