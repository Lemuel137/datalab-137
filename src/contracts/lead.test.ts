import { describe, expect, it } from "vitest";
import { leadRowSchema } from "@/contracts/lead";

describe("leadRowSchema", () => {
  it("célula vazia de engajamento é não medido, não zero", () => {
    const r = leadRowSchema.parse({ nome: "Loja", seguidores: "", engajamento_pct: " " });
    expect(r.seguidores).toBeUndefined();
    expect(r.engajamento_pct).toBeUndefined();
  });

  it("lê seguidores e engajamento quando informados", () => {
    const r = leadRowSchema.parse({ nome: "Loja", seguidores: "38000", engajamento_pct: "0.15" });
    expect(r.seguidores).toBe(38000);
    expect(r.engajamento_pct).toBe(0.15);
  });
});
