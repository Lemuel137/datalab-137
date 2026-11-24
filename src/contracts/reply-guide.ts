import type { FindingKind } from "@/contracts/finding";

/**
 * Roteiro da segunda mensagem, por tipo de achado e pelo que a pessoa respondeu.
 * Base: Supercomunicadores (Charles Duhigg). Antes de qualquer coisa, repetir com as
 * próprias palavras o que a pessoa disse; depois fazer a ponte com o anúncio; por fim
 * pedir licença com uma pergunta. Nenhum texto promete resultado.
 */
export type ReplyCase = { when: string; text: string };
export type ReplyGuide = { bridge: string; cases: ReplyCase[] };

export const REPLY_RULE =
  "Comece repetindo, com as suas palavras, o que a pessoa disse. Só depois use um dos textos abaixo, ajustado ao que ela escreveu.";

const WHO: ReplyCase = {
  when: "Perguntou quem é você ou o que você quer",
  text: "Justo perguntar. Trabalho com anúncio para negócios como o de vocês e, antes de falar com alguém, olho como a casa aparece para quem chega pelo anúncio. Posso te mostrar em 15 minutos o que eu vi?",
};
const AGENCY = (subject: string): ReplyCase => ({
  when: "Disse que já tem alguém ou uma agência cuidando",
  text: `Faz sentido ter alguém nisso. Não quero atravessar o trabalho de ninguém. Só fiquei curioso com ${subject}: vocês acompanham de perto o que essa pessoa vem testando?`,
});

const GUIDES: Record<string, ReplyGuide> = {
  anuncio_parado: {
    bridge: "Anúncio antigo costuma perder força com o tempo: o mesmo público já viu muitas vezes.",
    cases: [
      {
        when: "Disse que o anúncio ainda funciona",
        text: "Que bom que ele segue trazendo pedido. Pergunto porque anúncio que roda há tanto tempo costuma ser visto muitas vezes pelas mesmas pessoas. Vocês conseguem ver hoje quanto cada pedido vindo dele está custando?",
      },
      {
        when: "Disse que caiu ou que não sabe dizer",
        text: "Entendi, e é comum não ter esse número na mão. Costuma ser o primeiro sinal de que o anúncio cansou o público. Faz sentido eu te mostrar em 15 minutos o que eu olharia primeiro nos anúncios de vocês?",
      },
      {
        when: "Disse que não tem tempo de mexer nisso",
        text: "Imagino, a operação consome o dia inteiro. Por isso mesmo perguntei: anúncio deixado sozinho segue gastando sem ninguém olhar. Quem decide hoje quanto vocês investem nele por mês?",
      },
      AGENCY("um anúncio no ar há tanto tempo sem troca"),
      WHO,
    ],
  },
  avaliacao_sem_resposta: {
    bridge: "Quem vê o anúncio de uma casa que não conhece costuma olhar o Google antes de pedir.",
    cases: [
      {
        when: "Disse que não dá conta, é correria",
        text: "Entendo, na hora do pico não sobra ninguém para isso. Pergunto porque quem vê o anúncio de vocês costuma olhar o Google antes de pedir. Vocês sabem hoje quanto do que investem em anúncio vira pedido?",
      },
      {
        when: "Disse que não sabia dessas avaliações",
        text: "É normal, o Google não avisa direito. Posso te mandar quais são? E aproveito para te mostrar uma coisa que vi nos anúncios de vocês, pode ser?",
      },
      {
        when: "Disse que as reclamações são injustas ou de um dia ruim",
        text: "Acontece, um dia de casa cheia pesa na ficha por meses. O ponto é que quem chega pelo anúncio lê isso sem saber do contexto. Vocês anunciam hoje para quem ainda não conhece a casa, ou mais para quem já é cliente?",
      },
      AGENCY("as avaliações recentes sem resposta"),
      WHO,
    ],
  },
  cardapio_fraco: {
    bridge: "O anúncio leva a pessoa até o cardápio; é lá que ela decide se pede.",
    cases: [
      {
        when: "Disse que o pessoal pergunta pelo WhatsApp",
        text: "Então a dúvida existe e vocês resolvem no atendimento. O que não aparece é quem ficou em dúvida e não perguntou. Vocês conseguem ver quantas pessoas entram no cardápio e saem sem pedir?",
      },
      {
        when: "Disse que falta tempo para arrumar o cardápio",
        text: "Faz sentido, foto e descrição ficam para depois quando a casa está cheia. Pergunto porque o anúncio de vocês leva direto para esse cardápio. Vocês sabem quanto dos cliques do anúncio vira pedido hoje?",
      },
      {
        when: "Disse que isso não faz diferença",
        text: "Pode ser que para quem já é cliente não faça mesmo. Minha dúvida é com quem chega pelo anúncio sem conhecer a casa. Vocês anunciam mais para cliente novo ou para quem já pediu?",
      },
      AGENCY("os itens do cardápio que o anúncio divulga"),
      WHO,
    ],
  },
  criativo_sem_diferencial: {
    bridge:
      "Anúncio só de preço disputa com toda loja que vende parecido; o diferencial é o que segura a margem.",
    cases: [
      {
        when: "Disse que só testou foto com preço ou promoção",
        text: "Entendi, e é o caminho mais comum, porque é o mais rápido de produzir. O limite dele é que a pessoa compara só o preço. O que os clientes de vocês costumam elogiar depois que recebem o produto?",
      },
      {
        when: "Disse que já testou outras coisas e não funcionou",
        text: "Vale ouro saber disso. Às vezes o teste não anda pelo formato, às vezes pelo público que viu. Você lembra o que foi testado e por quanto tempo ficou no ar?",
      },
      {
        when: "Disse que promoção é o que vende",
        text: "Faz sentido, promoção vende mesmo, ainda mais nesta época. A conta que eu olharia é a margem que sobra quando só o desconto traz a venda. Como está a taxa de conversão do site hoje, fora das promoções?",
      },
      AGENCY("os anúncios serem quase todos de preço"),
      WHO,
    ],
  },
  pagina_produto: {
    bridge: "O cliente não pega o produto na mão: quem quebra a objeção é a página.",
    cases: [
      {
        when: "Disse que tira dúvida pelo WhatsApp ou pelo direct",
        text: "Então o atendimento de vocês segura bem quem pergunta. Quem não aparece é quem ficou em dúvida e saiu sem falar nada. Vocês acompanham quantas pessoas chegam na página do produto e não colocam no carrinho?",
      },
      {
        when: "Disse que nunca pensou nisso",
        text: "É comum, a página vai ficando do jeito que nasceu. Pergunto porque o anúncio de vocês manda a pessoa direto para ela. Como está a taxa de conversão do site hoje?",
      },
      {
        when: "Disse que a plataforma não permite ou que é difícil mexer",
        text: "Entendo, cada plataforma tem a sua limitação. Em geral dá para resolver boa parte sem trocar de sistema. Qual plataforma vocês usam hoje?",
      },
      AGENCY("a página de produto que os anúncios divulgam"),
      WHO,
    ],
  },
};

const DEFAULT: ReplyGuide = {
  bridge:
    "O achado é o motivo da conversa; a ponte é o caminho de quem chega pelo anúncio até a compra.",
  cases: [
    {
      when: "Respondeu contando como faz hoje",
      text: "Entendi como vocês fazem. Pergunto porque isso costuma pesar em quem chega pelo anúncio sem conhecer vocês. Vocês sabem hoje quanto do que investem em anúncio vira venda?",
    },
    {
      when: "Disse que não tem tempo para isso",
      text: "Imagino, a operação consome o dia. Por isso perguntei: é o tipo de coisa que segue custando sem ninguém olhar. Quem decide hoje o que vocês investem em anúncio?",
    },
    AGENCY("o que eu vi"),
    WHO,
  ],
};

export function replyGuide(kind: FindingKind | string | undefined): ReplyGuide {
  return GUIDES[kind ?? ""] ?? DEFAULT;
}
