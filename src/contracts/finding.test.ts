import { describe, expect, it } from "vitest";
import { findingFormSchema } from "./finding";

const ok = {
  leadId: "2bc0760b-de6c-4fab-964f-8f35c50c8731",
  summary: "Site sem página de produto em dois itens testados",
  evidenceUrl: "https://exemplo.com.br/produto",
  confidence: "alta",
};

describe("findingFormSchema", () => {
  it("aceita achado completo", () => {
    expect(findingFormSchema.safeParse(ok).success).toBe(true);
  });

  it("recusa sem URL de evidência", () => {
    const r = findingFormSchema.safeParse({ ...ok, evidenceUrl: "" });
    expect(r.success).toBe(false);
  });

  it("recusa URL que não é URL", () => {
    const r = findingFormSchema.safeParse({ ...ok, evidenceUrl: "vi no site" });
    expect(r.success).toBe(false);
  });

  it("recusa descrição curta demais", () => {
    const r = findingFormSchema.safeParse({ ...ok, summary: "ruim" });
    expect(r.success).toBe(false);
  });

  it("recusa confiança fora do catálogo", () => {
    const r = findingFormSchema.safeParse({ ...ok, confidence: "certeza" });
    expect(r.success).toBe(false);
  });

  it("recusa leadId que não é uuid", () => {
    const r = findingFormSchema.safeParse({ ...ok, leadId: "123" });
    expect(r.success).toBe(false);
  });
});
