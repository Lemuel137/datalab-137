import { describe, expect, it } from "vitest";
import {
  BRIEFING_QUESTIONS,
  TOKEN_RE,
  UFS,
  answerLines,
  briefingSaveSchema,
  progress,
} from "./briefing";

const fields = BRIEFING_QUESTIONS.flatMap((q) => q.fields);

describe("briefing", () => {
  it("nicho e cliente ideal não trazem resposta pronta", () => {
    for (const id of ["vende", "melhor_cliente", "pior_cliente", "quem", "precisa", "descarta"]) {
      const q = BRIEFING_QUESTIONS.find((x) => x.id === id)!;
      expect(q.fields).toHaveLength(1);
      expect(q.fields[0].kind).toBe("long");
    }
    const texto = BRIEFING_QUESTIONS.map((q) => `${q.title} ${q.why}`)
      .join(" ")
      .toLowerCase();
    expect(texto).not.toMatch(/pizzaria|clínica|e-commerce|delivery/);
  });

  it("pergunta de fato é direta: região, preço e canal têm campos objetivos", () => {
    const kinds = (id: string) =>
      BRIEFING_QUESTIONS.find((q) => q.id === id)!.fields.map((f) => f.kind);
    expect(kinds("regiao")).toEqual(["choice", "ufs", "short", "choice"]);
    expect(kinds("preco")).toEqual(["money", "money", "choice"]);
    expect(kinds("canal")).toEqual(["multi", "choice"]);
    expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
  });

  it("guarda só campo que existe, limpo e validado pelo tipo", () => {
    const r = briefingSaveSchema.parse({
      answers: {
        vende: "  edição de vídeo  ",
        inventada: "x",
        regiao_ufs: "sp, MG ,XX",
        regiao_abrangencia: "estados",
        preco_min: "R$ 1.500,00",
        preco_max: "abc",
        canal_canais: "WhatsApp,Fax,Instagram",
        canal_semana: "10",
      },
    });
    expect(r.answers).toEqual({
      vende: "edição de vídeo",
      regiao_ufs: "SP,MG",
      regiao_abrangencia: "estados",
      preco_min: "1500",
      canal_canais: "WhatsApp,Instagram",
      canal_semana: "10",
    });
  });

  it("opção fora da lista é descartada", () => {
    const r = briefingSaveSchema.parse({
      answers: { regiao_abrangencia: "galáxia", canal_semana: "7" },
    });
    expect(r.answers).toEqual({});
  });

  it("recusa resposta gigante e corpo fora do formato", () => {
    expect(briefingSaveSchema.safeParse({ answers: { vende: "a".repeat(4001) } }).success).toBe(
      false,
    );
    expect(briefingSaveSchema.safeParse({ answers: "texto" }).success).toBe(false);
  });

  it("progresso conta pergunta com qualquer campo preenchido", () => {
    expect(progress({ vende: "x", regiao_ufs: "SP", preco_min: "100", preco_max: "900" })).toEqual({
      done: 3,
      total: BRIEFING_QUESTIONS.length,
    });
  });

  it("respostas viram linhas legíveis para quem lê no CRM", () => {
    const regiao = BRIEFING_QUESTIONS.find((q) => q.id === "regiao")!;
    expect(answerLines(regiao, { regiao_abrangencia: "estados", regiao_ufs: "SP,MG" })).toEqual([
      "Abrangência: alguns estados",
      "Estados: SP, MG",
    ]);
    const preco = BRIEFING_QUESTIONS.find((q) => q.id === "preco")!;
    expect(answerLines(preco, { preco_min: "1500", preco_max: "12000" })).toEqual([
      "Menor serviço: R$ 1.500",
      "Maior serviço: R$ 12.000",
    ]);
    expect(answerLines(BRIEFING_QUESTIONS[0], { vende: "vídeo" })).toEqual(["vídeo"]);
  });

  it("27 estados, e o endereço do briefing aceita só o formato do token", () => {
    expect(UFS).toHaveLength(27);
    expect(TOKEN_RE.test("a".repeat(32))).toBe(true);
    expect(TOKEN_RE.test("abc")).toBe(false);
  });
});
