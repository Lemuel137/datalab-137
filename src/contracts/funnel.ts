export const STAGES = [
  "importado",
  "qualificado",
  "aprovado",
  "contatado",
  "respondeu",
  "diagnostico",
  "reuniao",
  "fechado",
  "descartado",
] as const;

export type Stage = (typeof STAGES)[number];

export const CHANNELS = ["instagram", "whatsapp", "email", "indicacao"] as const;

export type Channel = (typeof CHANNELS)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  importado: "Importado",
  qualificado: "Qualificado",
  aprovado: "Aprovado para abordagem",
  contatado: "Contatado",
  respondeu: "Respondeu",
  diagnostico: "Diagnóstico enviado",
  reuniao: "Reunião",
  fechado: "Fechado",
  descartado: "Descartado",
};

const ORDER: Record<Stage, number> = {
  importado: 0,
  qualificado: 1,
  aprovado: 2,
  contatado: 3,
  respondeu: 4,
  diagnostico: 5,
  reuniao: 6,
  fechado: 7,
  descartado: 0,
};

export function canAdvance(from: Stage, to: Stage): boolean {
  if (to === "descartado") return true;
  if (from === "descartado") return to === "qualificado" || to === "importado";
  return ORDER[to] === ORDER[from] + 1;
}

export function requiresFinding(stage: Stage): boolean {
  return ORDER[stage] >= ORDER.aprovado;
}
