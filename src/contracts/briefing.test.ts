import { describe, expect, it } from "vitest";
import { BRIEFING_QUESTIONS, TOKEN_RE, briefingSaveSchema, progress } from "./briefing";

describe("briefing", () => {
  it("nenhuma pergunta traz resposta pronta: sem opções e sem exemplo de nicho", () => {
    for (const q of BRIEFING_QUESTIONS) {
      expect(q).not.toHaveProperty("options");
      expect(`${q.title} ${q.why}`.toLowerCase()).not.toMatch(
        /pizzaria|clínica|e-commerce|delivery/,
      );
    }
    expect(new Set(BRIEFING_QUESTIONS.map((q) => q.id)).size).toBe(BRIEFING_QUESTIONS.length);
  });

  it("guarda só as perguntas que existem, sem espaço nas pontas", () => {
    const r = briefingSaveSchema.parse({
      answers: { vende: "  edição de vídeo  ", inventada: "x", regiao: "" },
      submit: false,
    });
    expect(r.answers).toEqual({ vende: "edição de vídeo" });
  });

  it("recusa resposta gigante e corpo fora do formato", () => {
    expect(briefingSaveSchema.safeParse({ answers: { vende: "a".repeat(4001) } }).success).toBe(
      false,
    );
    expect(briefingSaveSchema.safeParse({ answers: "texto" }).success).toBe(false);
  });

  it("progresso conta as respondidas", () => {
    expect(progress({ vende: "x", regiao: "y" })).toEqual({
      done: 2,
      total: BRIEFING_QUESTIONS.length,
    });
  });

  it("endereço do briefing aceita só o formato do token", () => {
    expect(TOKEN_RE.test("a".repeat(32))).toBe(true);
    expect(TOKEN_RE.test("abc")).toBe(false);
    expect(TOKEN_RE.test("a".repeat(31) + "/")).toBe(false);
  });
});
