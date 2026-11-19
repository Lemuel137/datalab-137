import { describe, expect, it } from "vitest";
import { matchKey, replyDate, type HistContact } from "./history";

const c = (over: Partial<HistContact> = {}): HistContact => ({
  canal: "instagram",
  enviado_em: "2026-10-30T16:32:00-03:00",
  follow_up: false,
  mensagem: "x",
  resposta_tipo: "pessoa",
  respondido_em: null,
  ...over,
});

describe("replyDate", () => {
  it("usa a data do arquivo quando existe", () => {
    const r = replyDate(c({ respondido_em: "2026-11-01T10:00:00-03:00" }), "qualquer 09/11");
    expect(r.fonte).toBe("arquivo");
    expect(r.at.toISOString()).toBe("2026-11-01T13:00:00.000Z");
  });

  it("lê data e hora do status", () => {
    const r = replyDate(c(), 'respondeu (pessoa, 09/11 09:54: "Pode mandar sim")');
    expect(r).toEqual({ at: new Date("2026-11-09T09:54:00-03:00"), fonte: "status_original" });
  });

  it("ignora data do status anterior ao envio", () => {
    const r = replyDate(c(), "lote de 28/10; respondeu em 03/11");
    expect(r.at).toEqual(new Date("2026-11-03T12:00:00-03:00"));
  });

  it("sem data no status, cai na data do envio", () => {
    const r = replyDate(c(), "respondeu (robô: mensagem automática)");
    expect(r).toEqual({ at: new Date("2026-10-30T16:32:00-03:00"), fonte: "envio" });
  });
});

describe("matchKey", () => {
  it("casa pelo Instagram sem @ e em minúsculas", () => {
    expect(matchKey({ nome: "X", instagram: "@Clinica.Ros" })).toEqual({ instagram: "clinica.ros" });
  });
  it("sem Instagram, casa pelo nome", () => {
    expect(matchKey({ nome: " CCM Pedidos " })).toEqual({ name: "ccm pedidos" });
  });
});
