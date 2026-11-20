import { describe, expect, it } from "vitest";
import { isIngestRequest } from "./proxy";

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
