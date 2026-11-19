import { describe, expect, it } from "vitest";
import {
  businessDaysBetween,
  contactLink,
  dailyQuota,
  gapWaitMs,
  renderMessage,
  spDay,
  validFinding,
  weekStart,
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
