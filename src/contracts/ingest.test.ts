import { describe, expect, it } from "vitest";
import { ingestSchema, isBlockedCity, mergeFinding } from "./ingest";

const finding = {
  summary: "a Calabresa 2 Queijos está sem descrição, junto com outras 7 pizzas",
  evidenceUrl: "https://pedido.anota.ai/loja/x",
  verifiedAt: "2026-11-19T06:05:00-03:00",
  kind: "cardapio_fraco",
};
const lead = { name: "Pizzaria X", whatsapp: "5547992706419", city: "Joinville", uf: "SC" };

describe("ingestSchema", () => {
  it("aceita o corpo do Captor e converte a data", () => {
    const r = ingestSchema.parse({ front: "delivery", leads: [{ ...lead, findings: [finding] }] });
    expect(r.leads[0].findings[0].verifiedAt).toEqual(new Date("2026-11-19T09:05:00Z"));
    expect(r.leads[0].findings[0].hook).toBeNull();
    expect(r.leads[0].signals).toEqual({});
  });
  it("recusa lead sem nenhum contato", () => {
    const r = ingestSchema.safeParse({ front: "delivery", leads: [{ name: "Sem Contato" }] });
    expect(r.success).toBe(false);
  });
  it("recusa data de medição no futuro e evidência que não é endereço", () => {
    const bad = (f: object) =>
      ingestSchema.safeParse({ front: "delivery", leads: [{ ...lead, findings: [f] }] }).success;
    expect(bad({ ...finding, verifiedAt: "2099-01-01T00:00:00Z" })).toBe(false);
    expect(bad({ ...finding, evidenceUrl: "cardapio" })).toBe(false);
  });
  it("gancho exige a marca de quem escreveu", () => {
    const r = ingestSchema.safeParse({
      front: "delivery",
      leads: [{ ...lead, findings: [{ ...finding, hook: "o anúncio da pizza de costela" }] }],
    });
    expect(r.success).toBe(false);
  });
  it("limita o lote a 300 leads", () => {
    const leads = Array.from({ length: 301 }, () => lead);
    expect(ingestSchema.safeParse({ front: "delivery", leads }).success).toBe(false);
  });
});

describe("isBlockedCity", () => {
  it("Limeira em qualquer grafia fica fora", () => {
    for (const c of ["Limeira", " LIMEIRA ", "limeira/SP", "Limeira - SP"]) {
      expect(isBlockedCity(c)).toBe(true);
    }
  });
  it("outras cidades passam, inclusive vazias", () => {
    for (const c of ["Campinas", "Limeira do Oeste", "", null, undefined]) {
      expect(isBlockedCity(c)).toBe(false);
    }
  });
});

describe("mergeFinding", () => {
  const old = { id: "f1", kind: "cardapio_fraco", summary: finding.summary, hook: "o anúncio X" };

  it("mesma medição: só avança a data e mantém o gancho", () => {
    expect(mergeFinding([old], { kind: "cardapio_fraco", summary: ` ${finding.summary.toUpperCase()} ` })).toEqual({
      action: "touch",
      id: "f1",
    });
  });
  it("medição diferente: troca o achado, e o gancho velho não fica", () => {
    expect(mergeFinding([old], { kind: "cardapio_fraco", summary: "a Margherita está sem foto" })).toEqual({
      action: "replace",
      removeIds: ["f1"],
    });
  });
  it("outro tipo de achado não é tocado", () => {
    expect(mergeFinding([{ ...old, kind: "destino_anuncio" }], { kind: "cardapio_fraco", summary: "x" })).toEqual({
      action: "replace",
      removeIds: [],
    });
  });
});
