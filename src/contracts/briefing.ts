import { z } from "zod";

/**
 * Briefing de prospecção: quem vai usar a ferramenta descreve o próprio negócio
 * e o cliente que procura. É a partir das respostas que a frente dele é montada.
 *
 * Duas regras do Lemuel (20/11/2026):
 * - Nada pré-pronto sobre QUEM prospectar: nicho, cliente ideal e sinal de
 *   oportunidade são perguntas em branco, sem opção e sem exemplo de segmento.
 * - Pergunta de FATO é direta: região, preço e canal têm campos objetivos, porque
 *   "onde eles estão?" em texto livre fica aberto demais.
 */
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const; // prettier-ignore

type Option = { value: string; label: string };
export type BriefingField =
  | { id: string; kind: "long" | "short" | "ufs" | "money"; label: string; hint?: string }
  | { id: string; kind: "choice" | "multi"; label: string; options: Option[]; hint?: string };
export type BriefingQuestion = { id: string; title: string; why: string; fields: BriefingField[] };

/** Pergunta aberta: um campo só, de texto longo, com o id da pergunta. */
const open = (id: string, title: string, why: string): BriefingQuestion => ({
  id,
  title,
  why,
  fields: [{ id, kind: "long", label: "" }],
});
const opts = (...pairs: [string, string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const BRIEFING_QUESTIONS: BriefingQuestion[] = [
  open(
    "vende",
    "O que você vende?",
    "Em uma ou duas frases, do jeito que você explicaria para um conhecido. É o que define para quem a prospecção procura.",
  ),
  open(
    "melhor_cliente",
    "Qual foi o melhor cliente que você já teve, e o que ele tinha de diferente?",
    "O melhor cliente mostra o perfil que vale buscar de novo: tamanho, momento, jeito de trabalhar.",
  ),
  open(
    "pior_cliente",
    "E um cliente que não valeu a pena? O que ele tinha?",
    "Vira critério de corte: quem tem esse sinal sai da lista antes de gastar uma abordagem.",
  ),
  open(
    "quem",
    "Que tipo de negócio você quer atender agora?",
    "Pode ser um tipo só ou vários. Escreva como você chama esses negócios no dia a dia.",
  ),
  {
    id: "regiao",
    title: "Onde eles estão?",
    why: "Marque a abrangência. Se não for o Brasil todo, escolha os estados ou escreva as cidades.",
    fields: [
      {
        id: "regiao_abrangencia",
        kind: "choice",
        label: "Abrangência",
        options: opts(
          ["brasil", "o Brasil todo"],
          ["estados", "alguns estados"],
          ["cidades", "algumas cidades"],
        ),
      },
      { id: "regiao_ufs", kind: "ufs", label: "Estados" },
      { id: "regiao_cidades", kind: "short", label: "Cidades", hint: "Separe por vírgula." },
      {
        id: "regiao_perto",
        kind: "choice",
        label: "Precisa ser perto de você?",
        options: opts(["sim", "sim, vou até o cliente"], ["nao", "não, atendo a distância"]),
      },
    ],
  },
  open(
    "tamanho",
    "Que tamanho de negócio faz sentido, e como dá para reconhecer isso olhando de fora?",
    "A prospecção só enxerga o que é público: site, redes sociais, anúncios, avaliações. O que nesses lugares mostra que o negócio tem o tamanho certo?",
  ),
  open(
    "precisa",
    "Olhando de fora, o que te faz pensar “esse aqui precisa de mim”?",
    "É o que a ferramenta vai procurar em cada negócio antes de sugerir a abordagem. Quanto mais concreto e fácil de conferir, melhor.",
  ),
  open(
    "descarta",
    "E o que te faz descartar na hora?",
    "Sinais de que não adianta abordar, mesmo que o negócio pareça do perfil.",
  ),
  {
    id: "preco",
    title: "Quanto custa o seu trabalho?",
    why: "O preço define o tamanho mínimo de cliente que compensa abordar.",
    fields: [
      { id: "preco_min", kind: "money", label: "Menor serviço" },
      { id: "preco_max", kind: "money", label: "Maior serviço" },
      {
        id: "preco_tipo",
        kind: "choice",
        label: "Cobrança",
        options: opts(
          ["mensal", "por mês"],
          ["projeto", "por projeto"],
          ["avulso", "por peça ou hora"],
        ),
      },
    ],
  },
  {
    id: "canal",
    title:
      "Por onde você conversa com cliente novo, e quantas conversas novas por semana dá conta de atender bem?",
    why: "Define o canal e o ritmo da fila. É melhor começar com poucas e responder bem.",
    fields: [
      {
        id: "canal_canais",
        kind: "multi",
        label: "Canais",
        options: ["WhatsApp", "Instagram", "E-mail", "Telefone", "Presencial"].map((v) => ({
          value: v,
          label: v,
        })),
      },
      {
        id: "canal_semana",
        kind: "choice",
        label: "Conversas novas por semana",
        options: [5, 10, 15, 20, 25, 30].map((n) => ({ value: String(n), label: String(n) })),
      },
    ],
  },
  open(
    "prova",
    "Que resultado ou trabalho seu dá para mostrar a quem ainda não te conhece?",
    "Entra depois da primeira resposta, quando a pessoa pede para ver. Só o que você pode mostrar de verdade.",
  ),
  open(
    "nunca",
    "O que você não quer na sua abordagem de jeito nenhum?",
    "Vira regra do texto: o que não dizer, o que não prometer, como não soar.",
  ),
];

export type BriefingAnswers = Record<string, string>;

const FIELDS = BRIEFING_QUESTIONS.flatMap((q) => q.fields);
const MAX_ANSWER = 4000;
const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean); // prettier-ignore

/** Limpa e valida o valor de um campo pelo tipo; devolve "" quando não vale. */
function clean(f: BriefingField, raw: string): string {
  const v = raw.trim();
  switch (f.kind) {
    case "choice":
      return f.options.some((o) => o.value === v) ? v : "";
    case "multi":
      return list(v).filter((x) => f.options.some((o) => o.value === x)).join(","); // prettier-ignore
    case "ufs":
      return list(v.toUpperCase()).filter((x) => (UFS as readonly string[]).includes(x)).join(","); // prettier-ignore
    case "money": {
      // "R$ 1.500,00" → 1500: fica só a parte inteira, sem separador de milhar.
      const n = Number(v.split(",")[0].replace(/\D/g, ""));
      return n > 0 ? String(n) : "";
    }
    default:
      return v;
  }
}

/** Endereço público do briefing: 32 caracteres aleatórios (base64 de URL). */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

/** Corpo do salvamento (rascunho ou envio). Só campo que existe é guardado. */
export const briefingSaveSchema = z.object({
  answers: z.record(z.string(), z.string().max(MAX_ANSWER)).transform((a) => {
    const out: BriefingAnswers = {};
    for (const f of FIELDS) {
      const v = clean(f, a[f.id] ?? "");
      if (v) out[f.id] = v;
    }
    return out;
  }),
  submit: z.boolean().default(false),
});

/** Pergunta conta como respondida quando qualquer campo dela foi preenchido. */
export function progress(answers: BriefingAnswers): { done: number; total: number } {
  const done = BRIEFING_QUESTIONS.filter((q) => q.fields.some((f) => answers[f.id]?.trim())).length;
  return { done, total: BRIEFING_QUESTIONS.length };
}

const brl = new Intl.NumberFormat("pt-BR");

/** As respostas de uma pergunta em linhas legíveis, para a leitura no CRM e a tela de enviado. */
export function answerLines(q: BriefingQuestion, answers: BriefingAnswers): string[] {
  const lines: string[] = [];
  for (const f of q.fields) {
    const v = answers[f.id]?.trim();
    if (!v) continue;
    let shown = v;
    if (f.kind === "choice") shown = f.options.find((o) => o.value === v)?.label ?? v;
    else if (f.kind === "multi" || f.kind === "ufs") shown = list(v).join(", ");
    else if (f.kind === "money") shown = `R$ ${brl.format(Number(v))}`;
    lines.push(f.label ? `${f.label}: ${shown}` : shown);
  }
  return lines;
}
