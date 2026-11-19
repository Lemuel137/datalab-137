import { describe, expect, it } from "vitest";
import { businessDaysBetween, dailyQuota, spDay, weekStart } from "./queue";

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
  const q = (weeklyTarget: number, sentNewThisWeek: number, channelRemaining: number, iso: string) =>
    dailyQuota({ weeklyTarget, sentNewThisWeek, channelRemaining, now: new Date(iso) });

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
