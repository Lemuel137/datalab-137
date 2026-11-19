import { describe, expect, it } from "vitest";
import { checkEngagement, engagementFloor } from "./engagement";

describe("engagementFloor", () => {
  it("usa a régua por tamanho do perfil", () => {
    expect(engagementFloor(800)).toBe(0.5);
    expect(engagementFloor(10_000)).toBe(0.5);
    expect(engagementFloor(10_001)).toBe(0.2);
    expect(engagementFloor(50_000)).toBe(0.2);
    expect(engagementFloor(50_001)).toBe(0.1);
    expect(engagementFloor(150_000)).toBe(0.1);
  });

  it("acima da última faixa continua com o menor piso, sem inventar outro", () => {
    expect(engagementFloor(1_300_000)).toBe(0.1);
  });
});

describe("checkEngagement", () => {
  it("não medido bloqueia, mesmo com seguidores conhecidos", () => {
    const r = checkEngagement({ followers: 5_000, engagement: null });
    expect(r).toMatchObject({ ok: false, reason: "nao_medido" });
  });

  it("zerado nunca passa, nem com piso da frente em zero", () => {
    expect(checkEngagement({ followers: 5_000, engagement: 0 })).toMatchObject({
      ok: false,
      reason: "zerado",
    });
    expect(checkEngagement({ followers: 5_000, engagement: 0, frontMin: 0 })).toMatchObject({
      ok: false,
      reason: "zerado",
    });
  });

  it("abaixo do piso da faixa reprova com a mensagem do piso certo", () => {
    const r = checkEngagement({ followers: 5_000, engagement: 0.3 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("0.5%");
  });

  it("o mesmo engajamento passa em porte maior", () => {
    expect(checkEngagement({ followers: 30_000, engagement: 0.3 })).toEqual({
      ok: true,
      floor: 0.2,
    });
  });

  it("piso da frente tem prioridade sobre a régua", () => {
    expect(checkEngagement({ followers: 5_000, engagement: 0.05, frontMin: 0.02 })).toEqual({
      ok: true,
      floor: 0.02,
    });
  });

  it("sem seguidores usa a faixa mais exigente em vez de aprovar no escuro", () => {
    expect(checkEngagement({ followers: null, engagement: 0.3 })).toMatchObject({
      ok: false,
      reason: "abaixo",
    });
  });
});
