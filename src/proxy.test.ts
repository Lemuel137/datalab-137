import { describe, expect, it } from "vitest";
import { isIngestRequest, isPublicRequest } from "./proxy";

const h = (o: Record<string, string> = {}) => new Headers(o);

describe("desvio do login para a porta de entrada", () => {
  it("libera só os dois caminhos exatos", () => {
    expect(isIngestRequest("/api/ingest/leads", h())).toBe(true);
    expect(isIngestRequest("/api/ingest/pendentes", h())).toBe(true);
    for (const p of [
      "/api/ingest/",
      "/api/ingest/outra",
      "/api/ingest/leads/x",
      "/API/ingest/leads",
      "/api/ingest",
    ]) {
      expect(isIngestRequest(p, h())).toBe(false);
    }
  });
  it("pedido de server action nunca passa pelo desvio", () => {
    expect(isIngestRequest("/api/ingest/leads", h({ "next-action": "abc" }))).toBe(false);
  });
});

describe("páginas públicas do briefing", () => {
  const t = "Ab3_-".repeat(6) + "Zz";
  it("libera só a página e a rota do briefing com token no formato certo", () => {
    expect(isPublicRequest(`/b/${t}`, h())).toBe(true);
    expect(isPublicRequest(`/api/briefing/${t}`, h())).toBe(true);
    for (const p of ["/b/", "/b/curto", `/b/${t}/x`, `/briefings`, `/api/briefing/`, `/fila`]) {
      expect(isPublicRequest(p, h())).toBe(false);
    }
  });
  it("pedido de server action nunca passa por página pública", () => {
    expect(isPublicRequest(`/b/${t}`, h({ "next-action": "abc" }))).toBe(false);
  });
});
