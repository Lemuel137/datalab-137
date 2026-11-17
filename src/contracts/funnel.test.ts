import { describe, expect, it } from "vitest";
import { canAdvance, nextStages, requiresFinding, STAGES, type Stage } from "./funnel";

const total = STAGES.length;

describe("canAdvance", () => {
  it("avança uma etapa por vez", () => {
    expect(canAdvance("importado", "qualificado")).toBe(true);
    expect(canAdvance("qualificado", "aprovado")).toBe(true);
    expect(canAdvance("contatado", "respondeu")).toBe(true);
  });

  it("recusa pular etapa", () => {
    expect(canAdvance("importado", "aprovado")).toBe(false);
    expect(canAdvance("qualificado", "contatado")).toBe(false);
  });

  it("recusa voltar", () => {
    expect(canAdvance("respondeu", "contatado")).toBe(false);
  });

  it("permite descartar de qualquer etapa, exceto da própria descartado", () => {
    for (const s of STAGES) expect(canAdvance(s, "descartado")).toBe(s !== "descartado");
  });

  it("recusa agir sobre lead já descartado, exceto reabrir como qualificado", () => {
    expect(canAdvance("descartado", "qualificado")).toBe(true);
    expect(canAdvance("descartado", "contatado")).toBe(false);
    expect(canAdvance("descartado", "descartado")).toBe(false);
  });

  it("recusa transição para a mesma etapa", () => {
    expect(canAdvance("contatado", "contatado")).toBe(false);
  });

  it("fechado é terminal", () => {
    expect(canAdvance("fechado", "descartado")).toBe(true);
    for (const s of STAGES) if (s !== "descartado") expect(canAdvance("fechado", s)).toBe(false);
  });

  it("cobre todas as etapas do catálogo", () => {
    expect(total).toBe(9);
  });
});

describe("requiresFinding", () => {
  it("exige achado a partir de aprovado", () => {
    expect(requiresFinding("importado")).toBe(false);
    expect(requiresFinding("qualificado")).toBe(false);
    expect(requiresFinding("aprovado")).toBe(true);
    expect(requiresFinding("reuniao" as Stage)).toBe(true);
  });
});

describe("nextStages", () => {
  it("em descartado oferece só reabrir como qualificado", () => {
    expect(nextStages("descartado")).toEqual(["qualificado"]);
  });

  it("em contatado oferece a próxima etapa e descartar", () => {
    expect(nextStages("contatado")).toEqual(["respondeu", "descartado"]);
  });

  it("em importado não oferece nada além de qualificar e descartar", () => {
    expect(nextStages("importado")).toEqual(["qualificado", "descartado"]);
  });

  it("em fechado oferece apenas descartar", () => {
    expect(nextStages("fechado")).toEqual(["descartado"]);
  });
});
