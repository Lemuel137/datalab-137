/**
 * Régua de engajamento por tamanho do perfil (decisão do Lemuel, 09/11/2026):
 * até 10 mil seguidores 0,5%; de 10 a 50 mil 0,2%; de 50 a 150 mil 0,1%.
 *
 * Engajamento vale para todas as frentes e perfil zerado nunca passa.
 * Aviso medido: em 09-10/11 a régua reprovou 29 de 32 perfis, e 24 de 24
 * lojas de moda que anunciam ficaram abaixo dela. Por isso cada frente pode
 * trocar o piso (`fronts.engagement_min`) sem mexer no código.
 */
export const ENGAGEMENT_RULER = [
  { upTo: 10_000, min: 0.5 },
  { upTo: 50_000, min: 0.2 },
  { upTo: 150_000, min: 0.1 },
] as const;

export function engagementFloor(followers: number): number {
  const faixa = ENGAGEMENT_RULER.find((f) => followers <= f.upTo);
  return (faixa ?? ENGAGEMENT_RULER[ENGAGEMENT_RULER.length - 1]).min;
}

export type EngagementInput = {
  followers: number | null | undefined;
  engagement: number | null | undefined;
  /** Piso fixo da frente. `null` ou ausente usa a régua por tamanho. */
  frontMin?: number | null;
};

export type EngagementVerdict =
  | { ok: true; floor: number }
  | { ok: false; reason: "nao_medido" | "zerado" | "abaixo"; message: string };

export function checkEngagement(input: EngagementInput): EngagementVerdict {
  const { followers, engagement } = input;

  if (engagement === null || engagement === undefined || Number.isNaN(engagement)) {
    return {
      ok: false,
      reason: "nao_medido",
      message: "Engajamento não medido. Meça os 12 últimos posts antes de qualificar.",
    };
  }

  if (engagement <= 0) {
    return {
      ok: false,
      reason: "zerado",
      message: "Engajamento zerado: perfil descartado pela regra.",
    };
  }

  const floor =
    input.frontMin ??
    (followers === null || followers === undefined
      ? ENGAGEMENT_RULER[0].min
      : engagementFloor(followers));

  if (engagement < floor) {
    return {
      ok: false,
      reason: "abaixo",
      message: `Engajamento ${engagement}% abaixo do piso de ${floor}% para este porte.`,
    };
  }

  return { ok: true, floor };
}
