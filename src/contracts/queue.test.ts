import { describe, expect, it } from "vitest";
import {
  businessDaysBetween,
  checkInstruction,
  checkLinks,
  contactLink,
  dailyQuota,
  gapWaitMs,
  missingVars,
  needsCheck,
  renderMessage,
  selectQueue,
  spDay,
  validFinding,
  validFindings,
  weekStart,
  type QContact,
  type QFinding,
  type QFront,
  type QLead,
} from "./queue";

// quinta 19/11/2026 10:00 de Brasília
const QUI = new Date("2026-11-19T10:00:00-03:00");

describe("calendário de Brasília", () => {
  it("spDay usa Brasília, não UTC", () => {
    expect(spDay(new Date("2026-11-19T22:30:00-03:00"))).toBe("2026-11-19");
  });

  it("3 dias úteis pulam o fim de semana", () => {
    const sexta = new Date("2026-11-13T16:00:00-03:00");
    expect(businessDaysBetween(sexta, new Date("2026-11-18T09:00:00-03:00"))).toBe(3);
    expect(businessDaysBetween(sexta, new Date("2026-11-17T09:00:00-03:00"))).toBe(2);
  });

  it("weekStart é a segunda de Brasília", () => {
    expect(weekStart(QUI).toISOString()).toBe("2026-11-16T03:00:00.000Z");
    // domingo à noite ainda pertence à semana que começou na segunda anterior
    expect(weekStart(new Date("2026-11-22T23:00:00-03:00")).toISOString()).toBe(
      "2026-11-16T03:00:00.000Z",
    );
  });
});

describe("dailyQuota", () => {
  const q = (
    weeklyTarget: number,
    sentNewThisWeek: number,
    channelRemaining: number,
    iso: string,
  ) => dailyQuota({ weeklyTarget, sentNewThisWeek, channelRemaining, now: new Date(iso) });

  it("meta 25 na segunda dá 5", () => {
    expect(q(25, 0, 20, "2026-11-16T09:00:00-03:00")).toBe(5);
  });
  it("segunda perdida: terça recebe 7", () => {
    expect(q(25, 0, 20, "2026-11-17T09:00:00-03:00")).toBe(7);
  });
  it("nunca passa do que resta no canal", () => {
    expect(q(100, 0, 4, "2026-11-19T10:00:00-03:00")).toBe(4);
  });
  it("meta batida ou meta zero dá 0", () => {
    expect(q(25, 25, 20, "2026-11-19T10:00:00-03:00")).toBe(0);
    expect(q(0, 0, 20, "2026-11-19T10:00:00-03:00")).toBe(0);
  });
  it("sábado dá 0", () => {
    expect(q(25, 0, 20, "2026-11-21T10:00:00-03:00")).toBe(0);
  });
  it("sexta às 22h ainda é sexta em Brasília", () => {
    expect(q(25, 20, 20, "2026-11-20T22:00:00-03:00")).toBe(5);
  });
});

describe("achado válido", () => {
  const f = (origin: string, iso: string) => ({ origin, verifiedAt: new Date(iso), summary: "x" });

  it("script: vale achado de até 24h, de qualquer origem", () => {
    expect(validFinding("script", [f("script", "2026-11-18T11:00:00-03:00")], QUI)).not.toBeNull();
    expect(
      validFinding("script", [f("conferido", "2026-11-19T08:00:00-03:00")], QUI),
    ).not.toBeNull();
    expect(validFinding("script", [f("script", "2026-11-18T09:00:00-03:00")], QUI)).toBeNull();
  });
  it("conferido: só achado conferido hoje", () => {
    expect(
      validFinding("conferido", [f("conferido", "2026-11-19T08:00:00-03:00")], QUI),
    ).not.toBeNull();
    expect(
      validFinding("conferido", [f("conferido", "2026-11-18T20:00:00-03:00")], QUI),
    ).toBeNull();
    expect(validFinding("conferido", [f("script", "2026-11-19T08:00:00-03:00")], QUI)).toBeNull();
  });
  it("devolve o válido mais recente", () => {
    const novo = f("script", "2026-11-19T06:00:00-03:00");
    expect(validFinding("script", [f("script", "2026-11-18T12:00:00-03:00"), novo], QUI)).toBe(
      novo,
    );
  });
});

describe("texto e link", () => {
  const lead = { whatsapp: null, phone: null, instagram: null };

  it("renderMessage troca {nome} e {achado} e mantém o resto", () => {
    expect(
      renderMessage("Oi, {nome}. Vi que {achado}. Faz sentido?", {
        nome: "Pizzaria X",
        achado: "43% sem foto",
      }),
    ).toBe("Oi, Pizzaria X. Vi que 43% sem foto. Faz sentido?");
  });
  it("WhatsApp: dígitos, DDI 55 e texto codificado", () => {
    expect(
      contactLink("whatsapp", { ...lead, whatsapp: "(47) 99270-6419" }, "43% & mais\nlinha"),
    ).toBe("https://wa.me/5547992706419?text=43%25%20%26%20mais%0Alinha");
    expect(contactLink("whatsapp", { ...lead, whatsapp: "554792706419" }, "oi")).toBe(
      "https://wa.me/554792706419?text=oi",
    );
  });
  it("WhatsApp cai no telefone; número curto não gera link", () => {
    expect(contactLink("whatsapp", { ...lead, phone: "+55 11 93010-7531" }, "oi")).toContain(
      "wa.me/5511930107531",
    );
    expect(contactLink("whatsapp", { ...lead, whatsapp: "9999" }, "oi")).toBeNull();
  });
  it("Instagram: link da conversa, sem texto", () => {
    expect(contactLink("instagram", { ...lead, instagram: "lojahaja_amor" }, "oi")).toBe(
      "https://ig.me/m/lojahaja_amor",
    );
    expect(contactLink("instagram", lead, "oi")).toBeNull();
  });
  it("e-mail e indicação não têm link", () => {
    expect(contactLink("email", { ...lead, instagram: "x" }, "oi")).toBeNull();
  });
  it("intervalo: 3 min no WhatsApp, 2 nos demais", () => {
    const last = new Date(QUI.getTime() - 60_000);
    expect(gapWaitMs("whatsapp", last, QUI)).toBe(120_000);
    expect(gapWaitMs("instagram", last, QUI)).toBe(60_000);
    expect(gapWaitMs("whatsapp", null, QUI)).toBe(0);
    expect(gapWaitMs("whatsapp", new Date(QUI.getTime() - 600_000), QUI)).toBe(0);
  });
});

describe("selectQueue", () => {
  const front: QFront = {
    channel: "whatsapp",
    dailyLimit: 20,
    weeklyTarget: 25,
    findingPolicy: "script",
    messageTemplate: "Oi {nome}: {achado}",
    followUpTemplate: "Oi {nome}, ainda faz sentido?",
    usesEngagement: false,
    engagementMin: null,
  };
  const lead = (id: string, over: Partial<QLead> = {}): QLead => ({
    id,
    name: `Pizzaria ${id}`,
    stage: "importado",
    whatsapp: "47992706419",
    phone: null,
    instagram: null,
    followers: null,
    engagementPct: null,
    signals: {},
    createdAt: new Date("2026-11-10T10:00:00-03:00"),
    ...over,
  });
  const finding = (leadId: string, iso = "2026-11-19T06:00:00-03:00"): QFinding => ({
    leadId,
    summary: "43% sem foto",
    origin: "script",
    verifiedAt: new Date(iso),
    evidenceUrl: "https://cardapio.example/x",
    hook: null,
    customerSide: null,
  });
  const contact = (leadId: string, iso: string, over: Partial<QContact> = {}): QContact => ({
    id: `c-${leadId}-${iso}`,
    leadId,
    channel: "whatsapp",
    sentAt: new Date(iso),
    isFollowUp: false,
    repliedAt: null,
    ...over,
  });
  const run = (i: Partial<Parameters<typeof selectQueue>[0]>) =>
    selectQueue({
      front,
      leads: [],
      findings: [],
      contacts: [],
      channelContacts: [],
      now: QUI,
      ...i,
    });
  const many = (n: number) => Array.from({ length: n }, (_, k) => lead(`L${k}`));

  it("novos: cota pela meta e ordem pela nota", () => {
    const leads = many(8).map((l, k) => ({ ...l, signals: { score: k } }));
    const q = run({ leads, findings: leads.map((l) => finding(l.id)) });
    expect(q.quota).toBe(13); // 25 ÷ quinta e sexta
    expect(q.novos.map((n) => n.lead.id)).toEqual(["L7", "L6", "L5", "L4", "L3", "L2", "L1", "L0"]);
    expect(q.novos[0].message).toBe("Oi Pizzaria L7: 43% sem foto");
    expect(q.novos[0].link).toContain("wa.me/5547992706419?text=Oi%20Pizzaria");
  });

  it("respeita o que resta do canal no dia", () => {
    const leads = many(30);
    const channelContacts = Array.from({ length: 18 }, () => ({
      sentAt: new Date("2026-11-19T08:00:00-03:00"),
    }));
    const q = run({ leads, findings: leads.map((l) => finding(l.id)), channelContacts });
    expect(q.sentToday).toBe(18);
    expect(q.novos).toHaveLength(2);
  });

  it("envio de ontem às 22h não conta em hoje", () => {
    const q = run({ channelContacts: [{ sentAt: new Date("2026-11-18T22:00:00-03:00") }] });
    expect(q.sentToday).toBe(0);
  });

  it("achado vencido, sem contato e pulado hoje ficam de fora", () => {
    const leads = [
      lead("velho"),
      lead("mudo", { whatsapp: null }),
      lead("pulado", { signals: { pulado_em: "2026-11-19" } }),
      lead("ontem", { signals: { pulado_em: "2026-11-18" } }),
    ];
    const findings = [
      finding("velho", "2026-11-18T04:00:00-03:00"),
      finding("mudo"),
      finding("pulado"),
      finding("ontem"),
    ];
    const q = run({ leads, findings });
    expect(q.novos.map((n) => n.lead.id)).toEqual(["ontem"]);
    expect(q.excluded.vencidos.map((l) => l.id)).toEqual(["velho"]);
    expect(q.excluded.semContato).toBe(1);
  });

  it("quem já foi contatado não volta como novo", () => {
    const l = lead("a", { stage: "contatado" });
    const q = run({
      leads: [l],
      findings: [finding("a")],
      contacts: [contact("a", "2026-11-18T10:00:00-03:00")],
    });
    expect(q.novos).toHaveLength(0);
    expect(q.followUps).toHaveLength(0);
  });

  it("follow-up vence com 3 dias úteis, uma vez, e só sem resposta", () => {
    const st = { stage: "contatado" as const };
    const leads = [
      lead("vencido", st),
      lead("respondeu", st),
      lead("jafeito", st),
      lead("cedo", st),
    ];
    const contacts = [
      contact("vencido", "2026-11-13T16:00:00-03:00"),
      contact("respondeu", "2026-11-13T16:00:00-03:00", {
        repliedAt: new Date("2026-11-14T10:00:00-03:00"),
      }),
      contact("jafeito", "2026-11-10T16:00:00-03:00"),
      contact("jafeito", "2026-11-16T16:00:00-03:00", { isFollowUp: true }),
      contact("cedo", "2026-11-17T16:00:00-03:00"),
    ];
    const q = run({ leads, contacts });
    expect(q.followUps.map((f) => f.lead.id)).toEqual(["vencido"]);
    expect(q.followUps[0].message).toBe("Oi Pizzaria vencido, ainda faz sentido?");
  });

  it("follow-up ocupa vaga do canal, não da meta semanal", () => {
    const novos = many(3);
    const fu = lead("fu", { stage: "contatado" });
    const channelContacts = Array.from({ length: 18 }, () => ({
      sentAt: new Date("2026-11-19T08:00:00-03:00"),
    }));
    const q = run({
      leads: [...novos, fu],
      findings: novos.map((l) => finding(l.id)),
      contacts: [contact("fu", "2026-11-13T16:00:00-03:00")],
      channelContacts,
    });
    expect(q.followUps).toHaveLength(1);
    expect(q.novos).toHaveLength(1);
  });

  it("primeiros contatos da semana descontam da meta", () => {
    const leads = [lead("novo"), lead("seg", { stage: "contatado" })];
    const q = run({
      leads,
      findings: [finding("novo")],
      contacts: [contact("seg", "2026-11-16T10:00:00-03:00")],
      channelContacts: [{ sentAt: new Date("2026-11-16T10:00:00-03:00") }],
    });
    expect(q.quota).toBe(12); // (25 − 1) ÷ 2
    expect(q.sentNewThisWeek).toBe(1);
  });

  it("frente sem texto não tem novos nem follow-ups", () => {
    const q = run({
      front: { ...front, messageTemplate: null, followUpTemplate: null },
      leads: [lead("a"), lead("fu", { stage: "contatado" })],
      findings: [finding("a")],
      contacts: [contact("fu", "2026-11-13T16:00:00-03:00")],
    });
    expect(q.novos).toHaveLength(0);
    expect(q.followUps).toHaveLength(0);
    expect(q.excluded.semTexto).toBe(true);
  });

  it("frente com engajamento barra quem não foi medido", () => {
    const q = run({
      front: { ...front, usesEngagement: true },
      leads: [lead("a")],
      findings: [finding("a")],
    });
    expect(q.novos).toHaveLength(0);
    expect(q.excluded.semEngajamento).toBe(1);
  });

  it("respondeu aparece na lista de respostas", () => {
    const q = run({ leads: [lead("r", { stage: "respondeu" })] });
    expect(q.replied.map((l) => l.id)).toEqual(["r"]);
  });

  it("intervalo desde o último envio do canal", () => {
    const q = run({ channelContacts: [{ sentAt: new Date(QUI.getTime() - 60_000) }] });
    expect(q.waitMs).toBe(120_000);
  });
});

describe("achados da revisão", () => {
  const lead = { whatsapp: null, phone: null, instagram: null };

  it("telefone: tira o zero de tronco e recusa o que não é um número só", () => {
    expect(contactLink("whatsapp", { ...lead, whatsapp: "011 98888-7777" }, "oi")).toContain(
      "wa.me/5511988887777?",
    );
    // ramal colado ao número e dois números no mesmo campo não viram link
    expect(contactLink("whatsapp", { ...lead, whatsapp: "(11) 3333-4444 r. 12" }, "oi")).toBeNull();
    expect(
      contactLink("whatsapp", { ...lead, whatsapp: "11 98888-7777 / 11 97777-6666" }, "oi"),
    ).toBeNull();
  });

  it("renderMessage não interpreta $ do achado", () => {
    expect(renderMessage("{nome}: {achado}", { nome: "X", achado: "R$' 10 e $& $$" })).toBe(
      "X: R$' 10 e $& $$",
    );
  });
});

describe("gancho e lado do cliente", () => {
  const T = "Oi! Vi {gancho} e reparei que {achado}.\n\n{cliente}. Quer os prints?";

  it("renderMessage troca as quatro partes", () => {
    expect(
      renderMessage("{nome}: vi {gancho}; {achado}; {cliente}", {
        nome: "X",
        achado: "2 produtos não abrem",
        gancho: "o anúncio do mimo",
        cliente: "quem volta para comprar não acha",
      }),
    ).toBe("X: vi o anúncio do mimo; 2 produtos não abrem; quem volta para comprar não acha");
  });

  it("missingVars aponta o que o texto pede e o achado não tem", () => {
    expect(missingVars(T, { nome: "X", achado: "a", gancho: "", cliente: null })).toEqual([
      "gancho",
      "cliente",
    ]);
    expect(missingVars(T, { nome: "X", achado: "a", gancho: "g", cliente: "c" })).toEqual([]);
    expect(missingVars("Oi {nome}", { nome: "X", achado: "" })).toEqual([]);
  });

  it("fila: achado sem gancho não vira mensagem genérica", () => {
    const front: QFront = {
      channel: "whatsapp",
      dailyLimit: 20,
      weeklyTarget: 25,
      findingPolicy: "script",
      messageTemplate: T,
      followUpTemplate: null,
      usesEngagement: false,
      engagementMin: null,
    };
    const lead = (id: string): QLead => ({
      id,
      name: id,
      stage: "importado",
      whatsapp: "47992706419",
      phone: null,
      instagram: null,
      followers: null,
      engagementPct: null,
      signals: {},
      createdAt: QUI,
    });
    const f = (leadId: string, hook: string | null, customerSide: string | null): QFinding => ({
      leadId,
      summary: "a de costela está sem foto",
      origin: "script",
      verifiedAt: new Date(QUI.getTime() - 3600_000),
      evidenceUrl: "https://x",
      hook,
      customerSide,
    });
    const q = selectQueue({
      front,
      leads: [lead("completo"), lead("semgancho")],
      findings: [
        f("completo", "o anúncio da pizza de costela", "quem chega pelo anúncio não vê a pizza"),
        f("semgancho", null, null),
      ],
      contacts: [],
      channelContacts: [],
      now: QUI,
    });
    expect(q.novos.map((n) => n.lead.id)).toEqual(["completo"]);
    expect(q.novos[0].message).toBe(
      "Oi! Vi o anúncio da pizza de costela e reparei que a de costela está sem foto.\n\nquem chega pelo anúncio não vê a pizza. Quer os prints?",
    );
    expect(q.excluded.semGancho.map((l) => l.id)).toEqual(["semgancho"]);
  });
});

describe("achado vetado", () => {
  it("veto mais recente não esconde achado bom de outro tipo", () => {
    const front: QFront = {
      channel: "whatsapp",
      dailyLimit: 20,
      weeklyTarget: 25,
      findingPolicy: "script",
      messageTemplate: "Vi {gancho}. {achado}. {cliente}.",
      followUpTemplate: null,
      usesEngagement: false,
      engagementMin: null,
    };
    const l: QLead = {
      id: "a",
      name: "A",
      stage: "importado",
      whatsapp: "47992706419",
      phone: null,
      instagram: null,
      followers: null,
      engagementPct: null,
      signals: {},
      createdAt: QUI,
    };
    const f = (min: number, over: Partial<QFinding>): QFinding => ({
      leadId: "a",
      summary: "achado bom com nome dos itens",
      origin: "script",
      verifiedAt: new Date(QUI.getTime() - min * 60_000),
      evidenceUrl: "https://x",
      hook: "o anúncio X",
      customerSide: "quem chega não vê",
      hookBy: "ia",
      ...over,
    });
    const vetado = f(5, {
      summary: "achado fraco",
      hook: null,
      customerSide: null,
      hookBy: "vetado",
    });
    const q = selectQueue({
      front,
      leads: [l],
      findings: [f(60, {}), vetado],
      contacts: [],
      channelContacts: [],
      now: QUI,
    });
    expect(q.novos.map((n) => n.finding?.summary)).toEqual(["achado bom com nome dos itens"]);
    // só vetado: fora da fila, sem contar como "falta gancho"
    const q2 = selectQueue({
      front,
      leads: [l],
      findings: [vetado],
      contacts: [],
      channelContacts: [],
      now: QUI,
    });
    expect(q2.novos).toHaveLength(0);
    expect(q2.excluded.semGancho).toHaveLength(0);
    expect(q2.excluded.vencidos.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("links de conferência", () => {
  const base = { kind: "cardapio_fraco", evidenceUrl: "https://pedido.anota.ai/loja/x" };

  it("cardápio, anúncios na Biblioteca e página, nessa ordem", () => {
    expect(
      checkLinks(base, { pagina_id: "108199067395243", pagina_fb: "https://www.facebook.com/x/" }),
    ).toEqual([
      { label: "abrir cardápio", href: "https://pedido.anota.ai/loja/x" },
      {
        label: "ver anúncios ativos",
        href: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=108199067395243",
      },
      { label: "página no Facebook", href: "https://www.facebook.com/x/" },
    ]);
  });
  it("outro tipo de achado chama a evidência pelo nome genérico", () => {
    expect(checkLinks({ kind: "destino_anuncio", evidenceUrl: "https://loja.com/p" }, {})).toEqual([
      { label: "abrir evidência", href: "https://loja.com/p" },
    ]);
  });
  it("só vira link o que é endereço http e id numérico", () => {
    expect(
      checkLinks(
        { kind: "outro", evidenceUrl: "prospeccao/pdfs/diagnostico.pdf" },
        { pagina_id: "abc<script>", pagina_fb: "javascript:alert(1)" },
      ),
    ).toEqual([]);
    expect(checkLinks(null, {})).toEqual([]);
  });
});

describe("achado de avaliação sem resposta", () => {
  const front: QFront = {
    channel: "whatsapp",
    dailyLimit: 20,
    weeklyTarget: 25,
    findingPolicy: "script",
    messageTemplate: null,
    followUpTemplate: null,
    usesEngagement: false,
    engagementMin: null,
    templatesByKind: {
      cardapio_fraco: "CARDAPIO: vi {gancho}; {achado}; {cliente}",
      avaliacao_sem_resposta: "GOOGLE: vi {gancho}; {achado}; {cliente}",
    },
  };
  const lead: QLead = {
    id: "a",
    name: "Pizzaria A",
    stage: "importado",
    whatsapp: "47992706419",
    phone: null,
    instagram: null,
    followers: null,
    engagementPct: null,
    signals: {},
    createdAt: QUI,
  };
  const f = (kind: string, hoursAgo: number, over: Partial<QFinding> = {}): QFinding => ({
    leadId: "a",
    kind,
    summary: `achado ${kind}`,
    origin: "script",
    verifiedAt: new Date(QUI.getTime() - hoursAgo * 3600_000),
    evidenceUrl: "https://x",
    hook: "o anúncio X",
    customerSide: "quem pesquisa vê",
    hookBy: "ia",
    ...over,
  });
  const run = (findings: QFinding[], fr: QFront = front) =>
    selectQueue({
      front: fr,
      leads: [lead],
      findings,
      contacts: [],
      channelContacts: [],
      now: QUI,
    });

  it("avaliação vale 7 dias; cardápio continua valendo 24 horas", () => {
    expect(validFinding("script", [f("avaliacao_sem_resposta", 72)], QUI)).not.toBeNull();
    expect(validFinding("script", [f("avaliacao_sem_resposta", 8 * 24)], QUI)).toBeNull();
    expect(validFinding("script", [f("cardapio_fraco", 72)], QUI)).toBeNull();
  });

  it("com os dois achados válidos, a avaliação abre a mensagem, com o texto dela", () => {
    const q = run([f("cardapio_fraco", 2), f("avaliacao_sem_resposta", 48)]);
    expect(q.novos[0].finding?.kind).toBe("avaliacao_sem_resposta");
    expect(q.novos[0].message).toBe(
      "GOOGLE: vi o anúncio X; achado avaliacao_sem_resposta; quem pesquisa vê",
    );
  });

  it("tipo sem texto próprio nem texto padrão não vira mensagem: usa o outro achado", () => {
    const soCardapio = { ...front, templatesByKind: { cardapio_fraco: "CARDAPIO: {achado}" } };
    const q = run([f("cardapio_fraco", 2), f("avaliacao_sem_resposta", 48)], soCardapio);
    expect(q.novos[0].finding?.kind).toBe("cardapio_fraco");
    expect(q.excluded.semTexto).toBe(false);
  });

  it("achado vetado ou sem gancho não derruba o outro", () => {
    const q = run([
      f("avaliacao_sem_resposta", 48, { hook: null, customerSide: null, hookBy: "vetado" }),
      f("cardapio_fraco", 2),
    ]);
    expect(q.novos[0].finding?.kind).toBe("cardapio_fraco");
    const q2 = run([
      f("avaliacao_sem_resposta", 48, { hook: null, customerSide: null, hookBy: null }),
      f("cardapio_fraco", 30),
    ]);
    expect(q2.novos).toHaveLength(0);
    expect(q2.excluded.semGancho.map((l) => l.id)).toEqual(["a"]);
  });

  it("frente sem nenhum texto continua avisando", () => {
    const q = run([f("cardapio_fraco", 2)], { ...front, templatesByKind: {} });
    expect(q.excluded.semTexto).toBe(true);
  });

  it("link de conferência da avaliação tem nome próprio", () => {
    expect(
      checkLinks({ kind: "avaliacao_sem_resposta", evidenceUrl: "https://maps.google.com/x" }, {}),
    ).toEqual([{ label: "abrir avaliações", href: "https://maps.google.com/x" }]);
  });
});

describe("conferência obrigatória da avaliação", () => {
  const front: QFront = {
    channel: "whatsapp",
    dailyLimit: 20,
    weeklyTarget: 25,
    findingPolicy: "script",
    messageTemplate: "{gancho}; {achado}; {cliente}",
    followUpTemplate: null,
    usesEngagement: false,
    engagementMin: null,
  };
  const lead: QLead = {
    id: "a",
    name: "A",
    stage: "importado",
    whatsapp: "47992706419",
    phone: null,
    instagram: null,
    followers: null,
    engagementPct: null,
    signals: {},
    createdAt: QUI,
  };
  const f = (kind: string, confirmedAt: Date | null): QFinding => ({
    leadId: "a",
    kind,
    summary: "achado",
    origin: "script",
    verifiedAt: new Date(QUI.getTime() - 3600_000),
    evidenceUrl: "https://x",
    hook: "g",
    customerSide: "c",
    hookBy: "ia",
    confirmedAt,
  });
  const check = (finding: QFinding) =>
    selectQueue({
      front,
      leads: [lead],
      findings: [finding],
      contacts: [],
      channelContacts: [],
      now: QUI,
    }).novos[0].needsCheck;

  it("avaliação sem conferência de hoje entra na fila, mas travada", () => {
    expect(check(f("avaliacao_sem_resposta", null))).toBe(true);
    expect(check(f("avaliacao_sem_resposta", new Date("2026-11-18T15:00:00-03:00")))).toBe(true);
  });
  it("conferida hoje (dia de Brasília) libera", () => {
    expect(check(f("avaliacao_sem_resposta", new Date("2026-11-19T07:30:00-03:00")))).toBe(false);
  });
  it("achado de cardápio não pede conferência", () => {
    expect(check(f("cardapio_fraco", null))).toBe(false);
  });
});

describe("achado de anúncio parado", () => {
  const f = (kind: string, hoursAgo: number, confirmedAt: Date | null = null) => ({
    kind,
    origin: "script",
    verifiedAt: new Date(QUI.getTime() - hoursAgo * 3600_000),
    confirmedAt,
  });

  it("vale 14 dias e sempre pede conferência", () => {
    expect(validFinding("script", [f("anuncio_parado", 13 * 24)], QUI)).not.toBeNull();
    expect(validFinding("script", [f("anuncio_parado", 15 * 24)], QUI)).toBeNull();
    expect(needsCheck(f("anuncio_parado", 1), QUI)).toBe(true);
    expect(needsCheck(f("anuncio_parado", 1, new Date("2026-11-19T08:00:00-03:00")), QUI)).toBe(
      false,
    );
  });

  it("achado sobre anúncio vem antes de avaliação e de cardápio", () => {
    const ordem = validFindings(
      "script",
      [
        f("cardapio_fraco", 1),
        f("avaliacao_sem_resposta", 2),
        f("anuncio_parado", 3),
        f("destino_anuncio", 4),
      ],
      QUI,
    ).map((x) => x.kind);
    expect(ordem).toEqual([
      "destino_anuncio",
      "anuncio_parado",
      "avaliacao_sem_resposta",
      "cardapio_fraco",
    ]);
  });

  it("link da Biblioteca não aparece duas vezes", () => {
    const href =
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=108199067395243";
    expect(
      checkLinks({ kind: "anuncio_parado", evidenceUrl: href }, { pagina_id: "108199067395243" }),
    ).toEqual([{ label: "ver anúncios ativos", href }]);
  });

  it("cada tipo com conferência tem a sua instrução", () => {
    expect(checkInstruction("anuncio_parado")).toContain("Biblioteca");
    expect(checkInstruction("avaliacao_sem_resposta")).toContain("avaliações");
    expect(checkInstruction("cardapio_fraco")).toBeNull();
  });
});
