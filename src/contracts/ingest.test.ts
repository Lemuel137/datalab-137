import { describe, expect, it } from "vitest";
import { ingestSchema, isBlockedCity, mergeFinding, parseIngest, sourceKey } from "./ingest";

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
  it("aceita o veto da IA: achado que não sustenta mensagem, sem gancho", () => {
    const r = ingestSchema.parse({
      front: "delivery",
      leads: [{ ...lead, findings: [{ ...finding, hookBy: "vetado" }] }],
    });
    expect(r.leads[0].findings[0]).toMatchObject({ hookBy: "vetado", hook: null });
  });
  it("veto não pode vir com gancho", () => {
    const r = ingestSchema.safeParse({
      front: "delivery",
      leads: [{ ...lead, findings: [{ ...finding, hookBy: "vetado", hook: "o anúncio X" }] }],
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
    expect(
      mergeFinding([old], {
        kind: "cardapio_fraco",
        summary: ` ${finding.summary.toUpperCase()} `,
      }),
    ).toEqual({
      action: "touch",
      id: "f1",
    });
  });
  it("medição diferente: troca o achado, e o gancho velho não fica", () => {
    expect(
      mergeFinding([old], { kind: "cardapio_fraco", summary: "a Margherita está sem foto" }),
    ).toEqual({
      action: "replace",
      removeIds: ["f1"],
    });
  });
  it("outro tipo de achado não é tocado", () => {
    expect(
      mergeFinding([{ ...old, kind: "destino_anuncio" }], { kind: "cardapio_fraco", summary: "x" }),
    ).toEqual({
      action: "replace",
      removeIds: [],
    });
  });
});

describe("achados da revisão da etapa 2", () => {
  it("um lead ruim não derruba o lote: os bons entram e o ruim volta com o índice", () => {
    const r = parseIngest({
      front: "delivery",
      leads: [
        lead,
        { name: "Sem contato" },
        { ...lead, findings: [{ ...finding, summary: "curto" }] },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.leads).toHaveLength(1);
    expect(r.rejeitados.map((x) => x.indice)).toEqual([1, 2]);
    expect(r.rejeitados[0].erro).toContain("WhatsApp");
  });
  it("envelope errado continua sendo erro do pedido inteiro", () => {
    expect(parseIngest({ front: "Delivery!", leads: [lead] }).ok).toBe(false);
    expect(parseIngest({ front: "delivery", leads: [] }).ok).toBe(false);
    expect(parseIngest("texto").ok).toBe(false);
  });
  it("sinais reservados da fila não entram por fora", () => {
    const r = parseIngest({
      front: "delivery",
      leads: [{ ...lead, signals: { score: 9, pulado_em: "2026-11-20" } }],
    });
    expect(r.ok && r.leads[0].signals).toEqual({ score: 9 });
  });
  it("endereço da fonte é comparado sem query, barra final, www e protocolo", () => {
    const base = "pedido.anota.ai/loja/pizzaria-x";
    for (const u of [
      "https://pedido.anota.ai/loja/pizzaria-x?f=ms",
      "http://www.pedido.anota.ai/loja/pizzaria-x/",
      "HTTPS://Pedido.Anota.ai/loja/pizzaria-x#topo",
    ]) {
      expect(sourceKey(u)).toBe(base);
    }
    expect(sourceKey("https://app.cardapioweb.com/Pizzaria_X")).toBe(
      "app.cardapioweb.com/Pizzaria_X",
    );
    expect(sourceKey(null)).toBeNull();
  });
});

describe("tipo de achado de avaliação", () => {
  it("a porta aceita avaliacao_sem_resposta", () => {
    const r = ingestSchema.parse({
      front: "delivery",
      leads: [{ ...lead, findings: [{ ...finding, kind: "avaliacao_sem_resposta" }] }],
    });
    expect(r.leads[0].findings[0].kind).toBe("avaliacao_sem_resposta");
  });
});

describe("seguidores e engajamento pela porta", () => {
  it("aceita os dois números medidos", () => {
    const r = ingestSchema.parse({
      front: "ecommerce",
      leads: [{ name: "Loja X", instagram: "@lojax", followers: 73000, engagementPct: 0.12 }],
    });
    expect(r.leads[0].followers).toBe(73000);
    expect(r.leads[0].engagementPct).toBe(0.12);
  });
  it("sem medição fica nulo, e número impossível é recusado", () => {
    const ok = ingestSchema.parse({
      front: "ecommerce",
      leads: [{ name: "Loja X", instagram: "@lojax" }],
    });
    expect(ok.leads[0].followers ?? null).toBeNull();
    const bad = (extra: object) =>
      ingestSchema.safeParse({
        front: "ecommerce",
        leads: [{ name: "Loja X", instagram: "@lojax", ...extra }],
      }).success;
    expect(bad({ followers: -1 })).toBe(false);
    expect(bad({ followers: 1.5 })).toBe(false);
    expect(bad({ engagementPct: 101 })).toBe(false);
  });
});
