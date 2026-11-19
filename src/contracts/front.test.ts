import { describe, expect, it } from "vitest";
import { frontEditSchema } from "./front";

const base = {
  id: "3f2b1c9e-8a44-4d6f-9b1e-2a7c5d8e9f10",
  dailyLimit: "20",
  weeklyTarget: "25",
  findingPolicy: "script",
  messageTemplate: "Oi {nome}: {achado}",
  followUpTemplate: "",
  active: "on",
};

describe("frontEditSchema", () => {
  it("aceita o formulário e converte os campos", () => {
    const r = frontEditSchema.parse(base);
    expect(r).toMatchObject({
      dailyLimit: 20,
      weeklyTarget: 25,
      findingPolicy: "script",
      followUpTemplate: null,
      active: true,
    });
  });
  it("meta semanal só de 5 em 5", () => {
    const r = frontEditSchema.safeParse({ ...base, weeklyTarget: "23" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("de 5 em 5");
  });
  it("meta negativa ou acima de 100 falha; zero pausa a frente", () => {
    expect(frontEditSchema.safeParse({ ...base, weeklyTarget: "-5" }).success).toBe(false);
    expect(frontEditSchema.safeParse({ ...base, weeklyTarget: "105" }).success).toBe(false);
    expect(frontEditSchema.parse({ ...base, weeklyTarget: "0" }).weeklyTarget).toBe(0);
  });
  it("texto só com espaço vira null", () => {
    expect(frontEditSchema.parse({ ...base, messageTemplate: "   " }).messageTemplate).toBeNull();
  });
  it("política desconhecida falha", () => {
    expect(frontEditSchema.safeParse({ ...base, findingPolicy: "qualquer" }).success).toBe(false);
  });
  it("limite diário entre 1 e 50", () => {
    expect(frontEditSchema.safeParse({ ...base, dailyLimit: "0" }).success).toBe(false);
    expect(frontEditSchema.safeParse({ ...base, dailyLimit: "51" }).success).toBe(false);
  });
  it("caixa desmarcada desativa", () => {
    expect(frontEditSchema.parse({ ...base, active: null }).active).toBe(false);
  });
});
