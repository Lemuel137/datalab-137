import { describe, expect, it } from "vitest";
import { approveBatch } from "./limits";

const NOW = new Date("2026-11-16T09:00:00Z");

describe("approveBatch", () => {
  it("aprova lote dentro do limite", () => {
    const r = approveBatch({
      channel: "instagram",
      dailyLimit: 15,
      requested: 5,
      sent: [],
      now: NOW,
      minGapMinutes: 2,
    });
    expect(r.ok).toBe(true);
  });

  it("recusa quando o lote estoura o restante do dia", () => {
    const sent = Array.from({ length: 12 }, () => ({
      channel: "instagram" as const,
      sentAt: new Date("2026-11-16T08:00:00Z"),
    }));
    const r = approveBatch({
      channel: "instagram",
      dailyLimit: 15,
      requested: 5,
      sent,
      now: NOW,
      minGapMinutes: 2,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.allowed).toBe(3);
  });

  it("recusa quando o limite diário já foi atingido", () => {
    const sent = Array.from({ length: 20 }, () => ({
      channel: "whatsapp" as const,
      sentAt: new Date("2026-11-16T07:00:00Z"),
    }));
    const r = approveBatch({
      channel: "whatsapp",
      dailyLimit: 20,
      requested: 1,
      sent,
      now: NOW,
      minGapMinutes: 3,
    });
    expect(r.ok).toBe(false);
  });

  it("ignora envios de outros dias", () => {
    const sent = Array.from({ length: 20 }, () => ({
      channel: "instagram" as const,
      sentAt: new Date("2026-11-15T07:00:00Z"),
    }));
    const r = approveBatch({
      channel: "instagram",
      dailyLimit: 15,
      requested: 10,
      sent,
      now: NOW,
      minGapMinutes: 0,
    });
    expect(r.ok).toBe(true);
  });

  it("recusa quando o intervalo mínimo entre envios não passou", () => {
    const r = approveBatch({
      channel: "instagram",
      dailyLimit: 15,
      requested: 1,
      sent: [],
      now: NOW,
      minGapMinutes: 3,
      lastSentAt: new Date("2026-11-16T08:59:00Z"),
    });
    expect(r.ok).toBe(false);
  });

  it("não confunde canal: limite do WhatsApp não consome o do Instagram", () => {
    const sent = Array.from({ length: 20 }, () => ({
      channel: "whatsapp" as const,
      sentAt: new Date("2026-11-16T08:00:00Z"),
    }));
    const r = approveBatch({
      channel: "instagram",
      dailyLimit: 15,
      requested: 10,
      sent,
      now: NOW,
      minGapMinutes: 0,
    });
    expect(r.ok).toBe(true);
  });
});
