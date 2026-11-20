import { z } from "zod";

/**
 * Briefing de prospecção: quem vai usar a ferramenta descreve o próprio negócio
 * e o cliente que procura, com as palavras dele. É a partir das respostas que a
 * frente dele é montada.
 *
 * Regra do Lemuel (20/11/2026): nada pré-pronto. Pergunta aberta, sem opção para
 * marcar e sem exemplo de nicho, para a resposta partir de quem responde.
 */
export const BRIEFING_QUESTIONS = [
  {
    id: "vende",
    title: "O que você vende?",
    why: "Em uma ou duas frases, do jeito que você explicaria para um conhecido. É o que define para quem a prospecção procura.",
  },
  {
    id: "melhor_cliente",
    title: "Qual foi o melhor cliente que você já teve, e o que ele tinha de diferente?",
    why: "O melhor cliente mostra o perfil que vale buscar de novo: tamanho, momento, jeito de trabalhar.",
  },
  {
    id: "pior_cliente",
    title: "E um cliente que não valeu a pena? O que ele tinha?",
    why: "Vira critério de corte: quem tem esse sinal sai da lista antes de gastar uma abordagem.",
  },
  {
    id: "quem",
    title: "Que tipo de negócio você quer atender agora?",
    why: "Pode ser um tipo só ou vários. Escreva como você chama esses negócios no dia a dia.",
  },
  {
    id: "regiao",
    title: "Onde eles estão?",
    why: "Cidade, região, estado ou o país todo. Diga também se precisa ser perto de você, e por quê.",
  },
  {
    id: "tamanho",
    title: "Que tamanho de negócio faz sentido, e como dá para reconhecer isso olhando de fora?",
    why: "A prospecção só enxerga o que é público: site, redes sociais, anúncios, avaliações. O que nesses lugares mostra que o negócio tem o tamanho certo?",
  },
  {
    id: "precisa",
    title: "Olhando de fora, o que te faz pensar “esse aqui precisa de mim”?",
    why: "É o que a ferramenta vai procurar em cada negócio antes de sugerir a abordagem. Quanto mais concreto e fácil de conferir, melhor.",
  },
  {
    id: "descarta",
    title: "E o que te faz descartar na hora?",
    why: "Sinais de que não adianta abordar, mesmo que o negócio pareça do perfil.",
  },
  {
    id: "preco",
    title: "Quanto custa o seu trabalho, do menor serviço ao maior?",
    why: "O preço define o tamanho mínimo de cliente que compensa abordar.",
  },
  {
    id: "canal",
    title:
      "Por onde você conversa com cliente novo hoje, e quantas conversas novas por semana você dá conta de atender bem?",
    why: "Define o canal e o ritmo da fila. É melhor começar com poucas e responder bem.",
  },
  {
    id: "prova",
    title: "Que resultado ou trabalho seu dá para mostrar a quem ainda não te conhece?",
    why: "Entra depois da primeira resposta, quando a pessoa pede para ver. Só o que você pode mostrar de verdade.",
  },
  {
    id: "nunca",
    title: "O que você não quer na sua abordagem de jeito nenhum?",
    why: "Vira regra do texto: o que não dizer, o que não prometer, como não soar.",
  },
] as const;

export type BriefingAnswers = Record<string, string>;

const IDS = BRIEFING_QUESTIONS.map((q) => q.id) as string[];
const MAX_ANSWER = 4000;

/** Endereço público do briefing: 32 caracteres aleatórios (base64 de URL). */
export const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

/** Corpo do salvamento (rascunho ou envio). Só pergunta que existe é guardada. */
export const briefingSaveSchema = z.object({
  answers: z.record(z.string(), z.string().max(MAX_ANSWER)).transform((a) => {
    const out: BriefingAnswers = {};
    for (const id of IDS) {
      const v = a[id]?.trim();
      if (v) out[id] = v;
    }
    return out;
  }),
  submit: z.boolean().default(false),
});

export function progress(answers: BriefingAnswers): { done: number; total: number } {
  return { done: IDS.filter((id) => answers[id]?.trim()).length, total: IDS.length };
}
